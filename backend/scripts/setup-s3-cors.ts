import 'dotenv/config';
import {
  S3Client,
  PutObjectCommand,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
  type CORSRule,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Одноразовый скрипт: ставит на бакет CORS-правила, разрешающие
 * браузерные multipart PUT'ы и видимость заголовка ETag (нужен для
 * complete-multipart). Без этого S3 на preflight'е отдаёт пусто
 * без `Access-Control-Allow-Origin`, и браузер блокирует запрос.
 *
 * Запуск:
 *   cd backend && npm run s3:cors
 *
 * Креды и endpoint берутся из backend/.env. Origins можно задать через
 * env-переменную S3_CORS_ALLOWED_ORIGINS (через запятую) — иначе разрешаем
 * "*". Для проверки конкретной школы укажи S3_CORS_PROBE_ORIGIN, например:
 *   S3_CORS_PROBE_ORIGIN=https://__APP_DOMAIN__ npm run s3:cors
 */

function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing env variable: ${name}`);
  }
  return value;
}

function parseOrigins(): string[] {
  const raw = process.env.S3_CORS_ALLOWED_ORIGINS;
  if (!raw || !raw.trim()) {
    // Dev: разрешаем всё. Под прод — переопредели через env.
    return ['*'];
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function firstCsvValue(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  return raw
    .split(',')
    .map((s) => s.trim())
    .find(Boolean) ?? null;
}

function resolveProbeOrigin(allowedOrigins: string[]): string {
  const explicit = process.env.S3_CORS_PROBE_ORIGIN?.trim();
  if (explicit) return explicit;

  const firstExactOrigin = allowedOrigins.find((origin) => origin !== '*');
  if (firstExactOrigin) return firstExactOrigin;

  const corsOrigin = firstCsvValue(process.env.CORS_ORIGIN);
  if (corsOrigin) return corsOrigin;

  const mainDomain = process.env.APP_MAIN_DOMAIN?.trim().replace(/^['"]|['"]$/g, '');
  if (mainDomain && mainDomain !== 'localhost' && !mainDomain.endsWith('.local')) {
    return `https://demo-school.${mainDomain}`;
  }

  return 'https://example.com';
}

async function verifyBrowserPreflight(
  client: S3Client,
  bucket: string,
  origin: string,
): Promise<void> {
  const key = `_cors-probe/${Date.now()}-${Math.random().toString(16).slice(2)}.txt`;
  const url = await getSignedUrl(
    client as unknown as Parameters<typeof getSignedUrl>[0],
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: 'text/plain',
    }) as unknown as Parameters<typeof getSignedUrl>[1],
    { expiresIn: 300 },
  );

  const response = await fetch(url, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'PUT',
      'Access-Control-Request-Headers': 'content-type',
    },
  });

  const allowOrigin = response.headers.get('access-control-allow-origin');
  const allowMethods = response.headers.get('access-control-allow-methods') ?? '';
  const allowHeaders = response.headers.get('access-control-allow-headers') ?? '';

  const originAllowed = allowOrigin === '*' || allowOrigin === origin;
  const methodAllowed = allowMethods
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .includes('PUT');
  const headersAllowed =
    allowHeaders === '*' ||
    allowHeaders
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .includes('content-type');

  if (!response.ok || !originAllowed || !methodAllowed || !headersAllowed) {
    throw new Error(
      [
        `Browser preflight failed for origin=${origin}`,
        `status=${response.status}`,
        `access-control-allow-origin=${allowOrigin ?? '-'}`,
        `access-control-allow-methods=${allowMethods || '-'}`,
        `access-control-allow-headers=${allowHeaders || '-'}`,
      ].join(' '),
    );
  }

  console.log(
    `[s3-cors] browser preflight OK: origin=${origin} allow-origin=${allowOrigin}`,
  );
}

async function verifyBrowserPreflightWithRetry(
  client: S3Client,
  bucket: string,
  origin: string,
  retryDelaysMs: number[],
): Promise<void> {
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    try {
      await verifyBrowserPreflight(client, bucket, origin);
      return;
    } catch (err) {
      const delay = retryDelaysMs[attempt];
      if (delay === undefined) throw err;
      console.log(
        `[s3-cors] browser preflight attempt ${attempt + 1} failed, retrying in ${delay}ms: ${
          (err as Error).message
        }`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function main() {
  const endpoint = getEnvOrThrow('S3_ENDPOINT');
  const region = getEnvOrThrow('S3_REGION');
  const accessKeyId = getEnvOrThrow('S3_ACCESS_KEY');
  const secretAccessKey = getEnvOrThrow('S3_SECRET_KEY');
  const bucket = getEnvOrThrow('S3_BUCKET_NAME');

  const allowedOrigins = parseOrigins();
  const probeOrigin = resolveProbeOrigin(allowedOrigins);

  const client = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    // Runtime presigned URLs use virtual-hosted style
    // (<bucket>.storage.yandexcloud.net). Verify the same URL shape here.
    forcePathStyle: false,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  const rules: CORSRule[] = [
    {
      ID: 'messenger-multipart-upload',
      AllowedMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
      AllowedOrigins: allowedOrigins,
      // На dev ставим * — браузер пропустит любые заголовки от XHR/fetch.
      // Для жёсткого прод-режима достаточно ['Content-Type', 'Authorization',
      // 'x-amz-*'], но * проще и безопасно для bucket'ов под нашим контролем.
      AllowedHeaders: ['*'],
      // ETag — самый важный для multipart-upload: без exposure фронт не сможет
      // собрать complete-multipart (response.headers.get('ETag') вернёт null).
      //
      // Content-Range / Content-Length / Accept-Ranges нужны для <video> seek
      // по подписанным S3 URLs (оригинал MP4 и HLS-сегменты .ts): браузер
      // отправляет Range и ожидает Content-Range в ответе, иначе блокирует
      // partial-content read и timeline-scrub не работает. Stage C делает
      // bytes-range запросы для каждого .ts-сегмента из manifest'а — без
      // этого exposure hls.js не сможет прогрессивно подгружать сегменты.
      ExposeHeaders: [
        'ETag',
        'x-amz-request-id',
        'x-amz-id-2',
        'Content-Range',
        'Content-Length',
        'Accept-Ranges',
      ],
      MaxAgeSeconds: 3600,
    },
  ];

  console.log(`[s3-cors] bucket=${bucket} endpoint=${endpoint}`);
  console.log(`[s3-cors] allowedOrigins=${JSON.stringify(allowedOrigins)}`);
  console.log(`[s3-cors] probeOrigin=${probeOrigin}`);
  console.log('[s3-cors] applying rules...');

  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: { CORSRules: rules },
    }),
  );

  console.log('[s3-cors] applied. verifying...');

  const RETRY_DELAYS_MS = [1_000, 2_000, 4_000];
  let verifyOk = false;
  let verifyDiag: string | null = null;
  let activeRules: CORSRule[] = [];
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const current = await client.send(
        new GetBucketCorsCommand({ Bucket: bucket }),
      );
      activeRules = current.CORSRules ?? [];
      verifyOk = true;
      break;
    } catch (err) {
      const code =
        (err as { Code?: string; name?: string }).Code ??
        (err as { name?: string }).name ??
        'UnknownError';
      verifyDiag = code;
      const isTransient =
        code === 'NoSuchCORSConfiguration' ||
        code === 'TimeoutError' ||
        code === 'ETIMEDOUT' ||
        code === 'NetworkingError';
      if (!isTransient) throw err;
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === undefined) break;
      console.log(`[s3-cors] verify attempt ${attempt + 1} got ${code}, retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  if (!verifyOk) {
    console.warn(
      `[s3-cors] PUT прошёл успешно, verify GET вернул ${verifyDiag} даже после retry.`,
    );
    console.warn(
      '[s3-cors] Это типично для Selectel S3 (ограниченная поддержка GetBucketCors).',
    );
    await verifyBrowserPreflightWithRetry(
      client,
      bucket,
      probeOrigin,
      RETRY_DELAYS_MS,
    );
    console.log('[s3-cors] done (PUT applied; GET verify skipped).');
    return;
  }

  console.log(`[s3-cors] active CORS rules: ${activeRules.length}`);
  for (const r of activeRules) {
    console.log(
      `  - ID=${r.ID ?? '-'} methods=${(r.AllowedMethods ?? []).join(',')} ` +
        `origins=${(r.AllowedOrigins ?? []).join(',')} ` +
        `expose=${(r.ExposeHeaders ?? []).join(',')}`,
    );
  }

  await verifyBrowserPreflightWithRetry(
    client,
    bucket,
    probeOrigin,
    RETRY_DELAYS_MS,
  );

  console.log('[s3-cors] done.');
}

main().catch((err) => {
  console.error('[s3-cors] FAILED:', err);
  process.exit(1);
});
