import { describe, expect, it } from 'vitest';

import {
  buildTotpUri,
  decodeBase32,
  decryptMfaSecret,
  encodeBase32,
  encryptMfaSecret,
  generateTotp,
  verifyTotp,
} from './admin-mfa.js';

describe('admin MFA primitives', () => {
  it.each([
    [59_000, '94287082'],
    [1_111_111_109_000, '07081804'],
    [1_111_111_111_000, '14050471'],
    [1_234_567_890_000, '89005924'],
    [2_000_000_000_000, '69279037'],
    [20_000_000_000_000, '65353130'],
  ])('matches the RFC 6238 SHA-1 vector at %i ms', (timestamp, expected) => {
    expect(generateTotp(Buffer.from('12345678901234567890'), timestamp, { digits: 8 })).toBe(
      expected,
    );
  });

  it('round-trips base32 values and accepts only the adjacent TOTP window', () => {
    const secret = encodeBase32(Buffer.from('twenty-byte-secret!'));
    expect(decodeBase32(secret)).toEqual(Buffer.from('twenty-byte-secret!'));
    const now = 1_800_000_000_000;
    const code = generateTotp(decodeBase32(secret), now);
    expect(verifyTotp(secret, code, now)?.timeStep).toBe(BigInt(now / 1_000 / 30));
    expect(verifyTotp(secret, code, now + 90_000)).toBeNull();
    expect(verifyTotp(secret, 'not-a-code', now)).toBeNull();
  });

  it('encrypts secrets with authenticated encryption and builds an interoperable URI', () => {
    const key = Buffer.alloc(32, 7);
    const ciphertext = encryptMfaSecret('JBSWY3DPEHPK3PXP', key);
    expect(ciphertext).not.toContain('JBSWY3DPEHPK3PXP');
    expect(decryptMfaSecret(ciphertext, key)).toBe('JBSWY3DPEHPK3PXP');
    expect(() => decryptMfaSecret(`${ciphertext}x`, key)).toThrow();

    const uri = new URL(buildTotpUri('owner@example.com', 'JBSWY3DPEHPK3PXP'));
    expect(uri.protocol).toBe('otpauth:');
    expect(uri.searchParams.get('issuer')).toBe('Tai Manic Studios');
    expect(uri.searchParams.get('secret')).toBe('JBSWY3DPEHPK3PXP');
  });
});
