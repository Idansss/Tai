import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { clearSessionCookie, readCookie, setSessionCookie } from './auth-cookie.js';
import type { AuthConfig } from './auth.types.js';

const productionConfig: AuthConfig = {
  nodeEnvironment: 'production',
  appPublicUrl: 'https://taimanic.example',
  tokenPepper: 'a'.repeat(32),
  cookieName: 'tms_session',
  sessionTtlSeconds: 3_600,
  verificationTtlSeconds: 3_600,
  resetTtlSeconds: 3_600,
  rateLimitWindowSeconds: 60,
  rateLimitMaxAttempts: 5,
};

describe('authentication cookies', () => {
  it('reads only the configured cookie', () => {
    expect(readCookie('theme=dark; tms_session=opaque-token; other=value', 'tms_session')).toBe(
      'opaque-token',
    );
    expect(readCookie('theme=dark', 'tms_session')).toBeUndefined();
  });

  it('sets and clears production cookies with the same hardened scope', () => {
    const response = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as Response;

    setSessionCookie(response, 'opaque-token', productionConfig);
    clearSessionCookie(response, productionConfig);

    expect(response.cookie).toHaveBeenCalledWith('tms_session', 'opaque-token', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/v1',
      maxAge: 3_600_000,
    });
    expect(response.clearCookie).toHaveBeenCalledWith('tms_session', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/v1',
    });
  });
});
