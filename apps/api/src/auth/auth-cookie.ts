import type { Response } from 'express';

import type { SessionCookieConfig } from './auth.types.js';

export function readCookie(
  cookieHeader: string | undefined,
  cookieName: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (name !== cookieName) continue;
    const value = part.slice(separator + 1).trim();
    return value || undefined;
  }
  return undefined;
}

export function setSessionCookie(
  response: Response,
  token: string,
  config: SessionCookieConfig,
): void {
  response.cookie(config.cookieName, token, {
    httpOnly: true,
    secure: config.nodeEnvironment === 'production',
    sameSite: 'lax',
    path: '/api/v1',
    maxAge: config.sessionTtlSeconds * 1_000,
  });
}

export function clearSessionCookie(response: Response, config: SessionCookieConfig): void {
  response.clearCookie(config.cookieName, {
    httpOnly: true,
    secure: config.nodeEnvironment === 'production',
    sameSite: 'lax',
    path: '/api/v1',
  });
}
