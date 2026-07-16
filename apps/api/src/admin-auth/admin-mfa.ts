import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_STEP_SECONDS = 30;

export interface TotpMatch {
  timeStep: bigint;
}

export function generateTotpSecret(): string {
  return encodeBase32(randomBytes(20));
}

export function generateTotp(
  secret: Uint8Array,
  timestampMs: number,
  options: { digits?: number; algorithm?: 'sha1' | 'sha256' | 'sha512'; stepSeconds?: number } = {},
): string {
  const digits = options.digits ?? 6;
  const stepSeconds = options.stepSeconds ?? TOTP_STEP_SECONDS;
  const counter = BigInt(Math.floor(timestampMs / 1_000 / stepSeconds));
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(counter);
  const digest = createHmac(options.algorithm ?? 'sha1', secret)
    .update(counterBytes)
    .digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return String(binary % 10 ** digits).padStart(digits, '0');
}

export function verifyTotp(
  base32Secret: string,
  code: string,
  timestampMs = Date.now(),
  window = 1,
): TotpMatch | null {
  if (!/^\d{6}$/.test(code)) return null;
  const secret = decodeBase32(base32Secret);
  const currentStep = Math.floor(timestampMs / 1_000 / TOTP_STEP_SECONDS);
  for (let offset = -window; offset <= window; offset += 1) {
    const timeStep = currentStep + offset;
    if (timeStep < 0) continue;
    const candidate = generateTotp(secret, timeStep * TOTP_STEP_SECONDS * 1_000);
    if (safeCodeEqual(candidate, code)) return { timeStep: BigInt(timeStep) };
  }
  return null;
}

export function encryptMfaSecret(base32Secret: string, key: Buffer): string {
  assertEncryptionKey(key);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(base32Secret, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

export function decryptMfaSecret(encoded: string, key: Buffer): string {
  assertEncryptionKey(key);
  const [version, iv, tag, ciphertext] = encoded.split('.');
  if (version !== 'v1' || !iv || !tag || !ciphertext) throw new Error('Invalid MFA secret.');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function buildTotpUri(email: string, secret: string): string {
  const issuer = 'Tai Manic Studios';
  const label = `${issuer}:${email}`;
  const url = new URL(`otpauth://totp/${encodeURIComponent(label)}`);
  url.searchParams.set('secret', secret);
  url.searchParams.set('issuer', issuer);
  url.searchParams.set('algorithm', 'SHA1');
  url.searchParams.set('digits', '6');
  url.searchParams.set('period', String(TOTP_STEP_SECONDS));
  return url.toString();
}

export function decodeBase32(value: string): Buffer {
  const normalized = value.toUpperCase().replace(/=+$/u, '');
  if (!normalized || !/^[A-Z2-7]+$/u.test(normalized)) throw new Error('Invalid base32 value.');
  let bits = '';
  for (const character of normalized) {
    bits += BASE32_ALPHABET.indexOf(character).toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

export function encodeBase32(value: Uint8Array): string {
  let bits = '';
  for (const byte of value) bits += byte.toString(2).padStart(8, '0');
  let encoded = '';
  for (let index = 0; index < bits.length; index += 5) {
    encoded += BASE32_ALPHABET[Number.parseInt(bits.slice(index, index + 5).padEnd(5, '0'), 2)];
  }
  return encoded;
}

function safeCodeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function assertEncryptionKey(key: Buffer): void {
  if (key.length !== 32) throw new Error('The MFA encryption key must contain 32 bytes.');
}
