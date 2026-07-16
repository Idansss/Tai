import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Interim admin credential + session cryptography for the CMS. Passwords are
 * scrypt-hashed; session tokens leave the process only as a cookie value and are
 * stored as peppered HMAC digests. Replaced by Codex's admin auth (B1-003) when
 * `/api/v1/admin/auth` lands — see docs/coordination/FRONTEND_TO_BACKEND.md.
 */

const SCRYPT_KEYLEN = 64;

function tokenPepper(): string {
  return process.env.CMS_TOKEN_PEPPER ?? 'cms-local-development-pepper-change-me';
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  const salt = parts[1];
  const expected = parts[2];
  if (parts.length !== 3 || parts[0] !== 'scrypt' || !salt || !expected) {
    return false;
  }
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  const a = Buffer.from(derived, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** A fresh opaque session token (the raw value goes to the cookie only). */
export function createSessionToken(): { token: string; tokenHash: string } {
  const token = `${randomUUID()}.${randomBytes(24).toString('hex')}`;
  return { token, tokenHash: hashSessionToken(token) };
}

export function hashSessionToken(token: string): string {
  return createHmac('sha256', tokenPepper()).update(token).digest('hex');
}
