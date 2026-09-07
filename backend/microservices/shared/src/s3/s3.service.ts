import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  type CompletedPart,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Config, type S3Config } from './s3.config';
import { Readable } from 'stream';

const DEFAULT_PART_SIZE = 8 * 1024 * 1024; // 8 MB — AWS minimum 5 MB
const DEFAULT_QUEUE_SIZE = 4;

@Injectable()
export class S3Service {
  private client: S3Client;
  private config: S3Config;

  constructor(configService: ConfigService) {
    this.config = getS3Config(configService);

    this.client = new S3Client({
      endpoint: this.config.endpoint,
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      // Используем virtual-hosted style (bucket как поддомен), а не path-style:
      // Selectel S3 на path-style URL'ах не отвечает на CORS preflight (HTTP
      // 405 на OPTIONS), а с virtual-hosted style preflight нормально
      // возвращает Access-Control-* заголовки. Ломать наши GET'ы это не
      // должно — оба формата принимаются на чтение/запись.
      forcePathStyle: false,
      // AWS SDK v3.730+ по умолчанию включил flexible-checksums (CRC32):
      // это запихивает в presigned URL параметры x-amz-checksum-crc32 и
      // x-amz-sdk-checksum-algorithm, плюс для UploadPart требует, чтобы
      // клиент прислал тело с этим CRC. Selectel S3 на эти поля либо
      // отвечает 400, либо роняет CORS preflight. Отключаем — нам
      // достаточно AWS Signature V4.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return key;
  }

  async uploadStream(key: string, body: Readable, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return key;
  }

  /**
   * Multipart streaming upload — для больших файлов (видео > 50 МБ, любой стрим
   * неизвестной длины). В отличие от `uploadStream`, не буферизует поток
   * целиком: режет на `partSize` чанки и загружает `queueSize` параллельно.
   *
   * Для мессенджера используется для оригиналов видео и transcoded renditions —
   * это сокращает RAM-footprint бэкенда и ускоряет заливку благодаря parallel
   * parts.
   */
  async uploadStreamMultipart(
    key: string,
    body: Readable,
    contentType: string,
    opts?: { partSize?: number; queueSize?: number },
  ): Promise<string> {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.config.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      },
      partSize: opts?.partSize ?? DEFAULT_PART_SIZE,
      queueSize: opts?.queueSize ?? DEFAULT_QUEUE_SIZE,
      leavePartsOnError: false,
    });
    await upload.done();
    return key;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
    });
    return getSignedUrl(
      this.client as unknown as Parameters<typeof getSignedUrl>[0],
      command as unknown as Parameters<typeof getSignedUrl>[1],
      { expiresIn },
    );
  }

  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 300,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(
      this.client as unknown as Parameters<typeof getSignedUrl>[0],
      command as unknown as Parameters<typeof getSignedUrl>[1],
      { expiresIn },
    );
  }

  async getObjectStream(
    key: string,
    range?: string,
  ): Promise<{
    stream: Readable;
    contentType: string | undefined;
    contentLength: number | undefined;
    contentRange: string | undefined;
    acceptRanges: string | undefined;
  }> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Range: range,
      }),
    );
    const body = response.Body;
    let stream: Readable;
    if (body instanceof Readable) {
      stream = body;
    } else if (body && typeof (body as any).getReader === 'function') {
      // Web ReadableStream — convert to Node stream
      stream = Readable.fromWeb(body as any);
    } else {
      // Fallback — wrap whatever we got
      stream = Readable.from(body as any ?? []);
    }
    return {
      stream,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      contentRange: response.ContentRange,
      acceptRanges: response.AcceptRanges,
    };
  }

  async getObjectSize(key: string): Promise<number | null> {
    const response = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      }),
    );
    return typeof response.ContentLength === 'number' ? response.ContentLength : null;
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      }),
    );
  }

  // ──────────────── Browser-driven multipart upload ────────────────
  // Эти методы выдают / завершают / отменяют S3 multipart upload, который
  // браузер выполняет самостоятельно через presigned URL'ы для каждой части.
  // Используется для больших файлов (видео): фронт режет файл на чанки и
  // грузит их параллельно — это в разы быстрее, чем один последовательный PUT.

  /**
   * Инициирует multipart upload и возвращает uploadId.
   * Selectel S3 принимает Content-Type на initiate; завершить операцию
   * нужно либо complete, либо abort, иначе S3 хранит части.
   * За cleanup отвечает lifecycle-правило AbortIncompleteMultipartUpload
   * (см. backend/scripts/setup-s3-lifecycle.ts).
   */
  async initiateMultipartUpload(
    key: string,
    contentType: string,
  ): Promise<{ uploadId: string }> {
    const result = await this.client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.config.bucketName,
        Key: key,
        ContentType: contentType,
      }),
    );
    if (!result.UploadId) {
      throw new Error('S3 did not return UploadId for multipart init');
    }
    return { uploadId: result.UploadId };
  }

  /**
   * Презайнит URL'ы для UploadPart по списку partNumber'ов.
   * Браузер на каждый URL делает PUT с куском файла; S3 возвращает ETag,
   * который мы потом передаём в completeMultipartUpload.
   *
   * partNumber должен быть от 1 до 10_000 (S3 spec).
   */
  async getPresignedPartUrls(
    key: string,
    uploadId: string,
    partNumbers: number[],
    expiresIn = 3600,
  ): Promise<Array<{ partNumber: number; url: string }>> {
    return Promise.all(
      partNumbers.map(async (partNumber) => {
        const cmd = new UploadPartCommand({
          Bucket: this.config.bucketName,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
        });
        const url = await getSignedUrl(
          this.client as unknown as Parameters<typeof getSignedUrl>[0],
          cmd as unknown as Parameters<typeof getSignedUrl>[1],
          { expiresIn },
        );
        return { partNumber, url };
      }),
    );
  }

  /**
   * Server-side UploadPart — для случаев, когда S3 endpoint не поддерживает
   * браузерные cross-origin preflight'ы (Selectel S3 отдаёт 405 на OPTIONS,
   * см. логи). Фронт шлёт каждую часть на наш backend, тот форвардит в S3
   * по своему серверному соединению (без CORS) и возвращает ETag.
   *
   * `body` — Buffer с данными части. Размер должен быть >= 5 МБ для всех
   * частей кроме последней (S3 spec).
   */
  async uploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    body: Buffer,
  ): Promise<{ etag: string }> {
    const result = await this.client.send(
      new UploadPartCommand({
        Bucket: this.config.bucketName,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: body,
      }),
    );
    if (!result.ETag) {
      throw new Error(`S3 did not return ETag for partNumber=${partNumber}`);
    }
    return { etag: result.ETag };
  }

  /**
   * Завершает multipart upload, склеивая части по ETag'ам.
   * AWS требует, чтобы части шли в порядке возрастания PartNumber и
   * не было gaps в номерах — на стороне фронта проверяется.
   */
  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: Array<{ partNumber: number; etag: string }>,
  ): Promise<void> {
    const completedParts: CompletedPart[] = [...parts]
      .sort((a, b) => a.partNumber - b.partNumber)
      .map((p) => ({
        PartNumber: p.partNumber,
        // ETag-ы из S3 обычно приходят с кавычками вокруг — оставляем как есть,
        // S3 принимает оба варианта, но кавычки безопаснее.
        ETag: p.etag,
      }));
    await this.client.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.config.bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: completedParts },
      }),
    );
  }

  /**
   * Отменяет multipart upload — освобождает части на стороне S3.
   * Вызывается при abort'е загрузки на фронте (отмена пользователем,
   * закрытая вкладка с beacon'ом, network drop). Lifecycle подстрахует
   * через 24 часа, но явный abort — best practice.
   */
  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    await this.client.send(
      new AbortMultipartUploadCommand({
        Bucket: this.config.bucketName,
        Key: key,
        UploadId: uploadId,
      }),
    );
  }
}
