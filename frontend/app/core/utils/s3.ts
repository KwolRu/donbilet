const FALLBACK_PUBLIC_ENDPOINT = "https://s3.ru-7.storage.selcloud.ru";
const FALLBACK_BUCKET = "donbilet";

function envEndpoint(): string | undefined {
  return process.env.NEXT_PUBLIC_S3_ENDPOINT?.trim();
}

function envBucket(): string | undefined {
  return process.env.NEXT_PUBLIC_S3_BUCKET_NAME?.trim();
}

function normalizeEndpoint(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  return trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;
}

function publicEndpoint(): string {
  return normalizeEndpoint(envEndpoint() ?? FALLBACK_PUBLIC_ENDPOINT);
}

function publicBucket(): string {
  return envBucket() ?? FALLBACK_BUCKET;
}

/**
 * Превращает S3 object key в публичный URL для чтения.
 * Подразумевается, что бакет публичный (как используется сейчас для LMS медиа).
 */
export function getS3PublicUrl(s3Key: string): string {
  const key = s3Key.startsWith("/") ? s3Key.slice(1) : s3Key;
  return `${publicEndpoint()}/${publicBucket()}/${encodeURI(key)}`;
}

/** true, если строка выглядит как S3 key, а не как http-URL. */
export function isS3Key(value: string): boolean {
  if (!value) return false;
  return !value.startsWith("http://") && !value.startsWith("https://") && !value.startsWith("blob:");
}
