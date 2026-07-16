import { describe, expect, it } from 'vitest';

import {
  createOpaqueToken,
  hashOpaqueValue,
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from './auth-crypto.js';

describe('authentication cryptography', () => {
  it('normalizes email addresses consistently with the database invariant', () => {
    expect(normalizeEmail(' Customer@Example.COM ')).toBe('customer@example.com');
  });

  it('stores salted scrypt hashes and verifies them in constant-length form', async () => {
    const first = await hashPassword('correct horse battery staple');
    const second = await hashPassword('correct horse battery staple');

    expect(first).not.toBe(second);
    expect(first).not.toContain('correct horse');
    await expect(verifyPassword('correct horse battery staple', first)).resolves.toBe(true);
    await expect(verifyPassword('wrong password', first)).resolves.toBe(false);
    await expect(verifyPassword('anything', 'not-a-password-hash')).resolves.toBe(false);
  });

  it('creates opaque tokens and hashes them with a deployment secret', () => {
    const token = createOpaqueToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hashOpaqueValue(token, 'a'.repeat(32))).not.toContain(token);
    expect(hashOpaqueValue(token, 'a'.repeat(32))).not.toBe(hashOpaqueValue(token, 'b'.repeat(32)));
  });
});
