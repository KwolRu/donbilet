/**
 * Browser-driven multipart upload через наш backend-proxy.
 *
 * Зачем proxy, а не direct-to-S3 presigned URL'ы:
 * - Многие S3-совместимые провайдеры на cross-origin OPTIONS preflight отвечают
 *   405 без `Access-Control-Allow-Origin`, поэтому браузер блокирует PUT с custom
 *   headers / query-параметрами на cross-origin URL.
 * - Same-origin POST'ы на наш `/api/<resource>/multipart-upload-part`
 *   preflight'а не требуют и идут без проблем: backend серверным соединением
 *   форвардит часть в S3.
 *
 * Параллелизм сохраняется: фронт держит pool из 6 одновременных XHR'ов,
 * каждый — отдельное TCP-соединение до gateway → доменного сервиса → S3.
 *
 * Контракт сервера (`multipart-init`):
 *   { s3Key, uploadId, partsCount }
 * Контракт сервера (`multipart-upload-part`):
 *   POST с binary body, headers:
 *     Content-Type: application/octet-stream
 *     X-Multipart-Key, X-Multipart-Upload-Id, X-Multipart-Part-Number
 *   → { partNumber, etag }
 */

export type MultipartUploadResult = {
  parts: Array<{ partNumber: number; etag: string }>;
};

export type MultipartUploadOptions = {
  /** Размер части. По дефолту 8 МБ. Минимум S3 — 5 МБ (кроме последней). */
  partSize?: number;
  /** Сколько частей грузить параллельно. По дефолту 6. */
  parallelism?: number;
  /** Прогресс 0..100. */
  onProgress?: (percent: number) => void;
  /** Отмена. */
  signal?: AbortSignal;
};

export type UploadPartFn = (
  partNumber: number,
  blob: Blob,
  onProgressDelta: (loadedBytes: number) => void,
  signal?: AbortSignal,
) => Promise<string>;

const DEFAULT_PART_SIZE = 8 * 1024 * 1024;
const DEFAULT_PARALLELISM = 6;

/**
 * Считает количество частей для размера файла.
 */
export function computePartsCount(fileSize: number, partSize = DEFAULT_PART_SIZE): number {
  if (fileSize <= 0) return 1;
  return Math.max(1, Math.ceil(fileSize / partSize));
}

/**
 * Грузит файл через S3 multipart с пулом параллельных PUT'ов.
 *
 * - `uploadPart(partNumber, blob, onProgressDelta, signal) → etag` — функция,
 *   которая шлёт один кусок на сервер и возвращает ETag. Делегируем,
 *   чтобы не таскать сюда зависимость от axios/fetch и chatId.
 * - Прогресс агрегируется по сумме `loaded` всех частей.
 *
 * При отмене (`signal.aborted`) промис реджектится с AbortError; вызывающий
 * сам делает `multipart-abort` на сервере, чтобы освободить части.
 */
export async function uploadMultipart(
  file: File | Blob,
  partsCount: number,
  uploadPart: UploadPartFn,
  opts: MultipartUploadOptions = {},
): Promise<MultipartUploadResult> {
  const partSize = opts.partSize ?? DEFAULT_PART_SIZE;
  const parallelism = Math.max(1, opts.parallelism ?? DEFAULT_PARALLELISM);
  const totalSize = file.size;
  const expectedPartsCount = computePartsCount(totalSize, partSize);

  if (partsCount !== expectedPartsCount) {
    throw new Error(
      `partsCount mismatch: server returned ${partsCount}, expected ${expectedPartsCount}`,
    );
  }

  const onProgress = opts.onProgress;
  let loaded = 0;
  const reportProgress = (delta: number) => {
    loaded += delta;
    if (!onProgress) return;
    if (totalSize <= 0) return;
    const pct = Math.min(99, Math.round((loaded / totalSize) * 100));
    onProgress(pct);
  };

  const parts: Array<{ partNumber: number; etag: string }> = new Array(partsCount);

  // Простой worker pool: индекс следующей не взятой части.
  let nextIndex = 0;
  const errors: Error[] = [];

  const worker = async () => {
    for (;;) {
      if (opts.signal?.aborted) return;
      const i = nextIndex;
      nextIndex += 1;
      if (i >= partsCount) return;

      const partNumber = i + 1;
      const start = (partNumber - 1) * partSize;
      const end = Math.min(start + partSize, totalSize);
      const blob = file.slice(start, end);
      try {
        const etag = await uploadPart(partNumber, blob, reportProgress, opts.signal);
        parts[i] = { partNumber, etag };
      } catch (err) {
        errors.push(err as Error);
        return;
      }
    }
  };

  const workers = Array.from({ length: Math.min(parallelism, partsCount) }, worker);
  await Promise.all(workers);

  if (opts.signal?.aborted) {
    throw new DOMException("Upload aborted", "AbortError");
  }
  if (errors.length > 0) {
    throw errors[0];
  }

  // Финальный 100% — после complete'а на сервере.
  if (onProgress) onProgress(100);

  return { parts };
}
