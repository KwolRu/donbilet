import 'dotenv/config';
import {
  S3Client,
  PutBucketLifecycleConfigurationCommand,
  GetBucketLifecycleConfigurationCommand,
  type LifecycleRule,
} from '@aws-sdk/client-s3';

/**
 * Одноразовый скрипт: применяет к S3-бакету правило lifecycle
 * "AbortIncompleteMultipartUpload after 1 day" под префиксом messenger/.
 *
 * Зачем: при отказе клиента (network drop / закрытая вкладка) во время
 * multipart-upload в S3 остаются висящие части, которые занимают место и
 * учитываются в storage-биллинге. Lifecycle-правило их автоматом удаляет
 * через сутки, так что незавершённые загрузки не накапливаются.
 *
 * Запуск:
 *   cd backend && npx ts-node --project tsconfig.json scripts/setup-s3-lifecycle.ts
 *
 * Креды берутся из backend/.env: S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY,
 * S3_SECRET_KEY, S3_BUCKET_NAME — те же, что использует приложение.
 */

const S3_PREFIX = 'messenger/';
const RULE_ID = 'abort-incomplete-multipart-1d';
const DAYS_AFTER_INITIATION = 1;

function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing env variable: ${name}`);
  }
  return value;
}

async function main() {
  const endpoint = getEnvOrThrow('S3_ENDPOINT');
  const region = getEnvOrThrow('S3_REGION');
  const accessKeyId = getEnvOrThrow('S3_ACCESS_KEY');
  const secretAccessKey = getEnvOrThrow('S3_SECRET_KEY');
  const bucket = getEnvOrThrow('S3_BUCKET_NAME');

  const client = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    // Selectel S3-compatible: path-style addressing работает стабильнее
    // virtual-hosted style, особенно на регионах вне AWS.
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  console.log(`[s3-lifecycle] bucket=${bucket} endpoint=${endpoint}`);
  console.log(`[s3-lifecycle] applying rule "${RULE_ID}" for prefix "${S3_PREFIX}" (${DAYS_AFTER_INITIATION}d)`);

  await client.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: bucket,
      LifecycleConfiguration: {
        Rules: [
          {
            ID: RULE_ID,
            Status: 'Enabled',
            Filter: { Prefix: S3_PREFIX },
            AbortIncompleteMultipartUpload: {
              DaysAfterInitiation: DAYS_AFTER_INITIATION,
            },
          },
        ],
      },
    }),
  );

  console.log('[s3-lifecycle] applied. verifying...');

  // Selectel S3 после успешного PUT может вернуть на немедленный GET
  // NoSuchLifecycleConfiguration (eventual consistency) — или вообще не
  // отдавать правило назад, если эндпоинт не поддерживает GET для lifecycle.
  // Verify здесь best-effort: мы уже знаем, что PUT принят, и лимит загрузок
  // не блокируется, если verify не получился.
  const RETRY_DELAYS_MS = [1_000, 2_000, 4_000];
  let rules: LifecycleRule[] = [];
  let verifyOk = false;
  let verifyDiag: string | null = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const current = await client.send(
        new GetBucketLifecycleConfigurationCommand({ Bucket: bucket }),
      );
      rules = current.Rules ?? [];
      verifyOk = true;
      break;
    } catch (err) {
      const code =
        (err as { Code?: string; name?: string }).Code ??
        (err as { name?: string }).name ??
        'UnknownError';
      verifyDiag = code;
      const isTransient =
        code === 'NoSuchLifecycleConfiguration' ||
        code === 'TimeoutError' ||
        code === 'ETIMEDOUT' ||
        code === 'NetworkingError';
      if (!isTransient) {
        // Auth/permission/что-то фундаментальное — фейлим, чтобы заметить.
        throw err;
      }
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === undefined) break;
      console.log(`[s3-lifecycle] verify attempt ${attempt + 1} got ${code}, retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  if (!verifyOk) {
    console.warn(
      `[s3-lifecycle] PUT прошёл успешно, verify GET вернул ${verifyDiag} даже после retry.`,
    );
    console.warn(
      '[s3-lifecycle] Это типично для Selectel S3 (ограниченная поддержка GetBucketLifecycle).',
    );
    console.warn(
      `[s3-lifecycle] Перепроверь вручную позже:`,
    );
    console.warn(
      `[s3-lifecycle]   aws s3api get-bucket-lifecycle-configuration --endpoint-url ${endpoint} --bucket ${bucket}`,
    );
    console.log('[s3-lifecycle] done (PUT applied; verify skipped).');
    return;
  }

  const ours = rules.find((r) => r.ID === RULE_ID);
  if (!ours) {
    console.warn(
      `[s3-lifecycle] Rule "${RULE_ID}" не виден в GetBucketLifecycle, хотя PUT прошёл.`,
    );
    console.warn(
      '[s3-lifecycle] Возможно бакет реально не сохраняет это правило. Проверь в панели Selectel.',
    );
  }

  console.log('[s3-lifecycle] active rules:');
  for (const r of rules) {
    const prefix =
      (r.Filter && 'Prefix' in r.Filter ? r.Filter.Prefix : undefined) ?? '(all)';
    const days = r.AbortIncompleteMultipartUpload?.DaysAfterInitiation ?? '-';
    console.log(`  - ${r.ID} status=${r.Status} prefix=${prefix} abortAfterDays=${days}`);
  }

  console.log('[s3-lifecycle] done.');
}

main().catch((err) => {
  console.error('[s3-lifecycle] FAILED:', err);
  process.exit(1);
});
