import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Шифрование чувствительных данных at-rest (AES-256-GCM).
 *
 * Для всего, что нельзя хранить открытым текстом: токены внешних интеграций,
 * учётные данные провайдеров, ключи API тенанта.
 *
 * Ключ берётся из env CRYPTO_KEY (любая длина — нормализуется до 32 байт через SHA-256).
 * Формат выхода: base64( iv[12] || authTag[16] || ciphertext ).
 *
 * Инвариант: зашифрованное значение никогда не попадает в логи, и ни одно
 * поле-секрет не пишется в БД мимо этого слоя.
 */
const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function resolveKey(rawKey: string | undefined): Buffer {
  if (!rawKey) {
    throw new Error('CRYPTO_KEY is not set — cannot encrypt/decrypt channel credentials');
  }
  return createHash('sha256').update(rawKey).digest();
}

export function encryptSecret(plaintext: string, rawKey = process.env.CRYPTO_KEY): string {
  const key = resolveKey(rawKey);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

export function decryptSecret(encoded: string, rawKey = process.env.CRYPTO_KEY): string {
  const key = resolveKey(rawKey);
  const buf = Buffer.from(encoded, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const authTag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
