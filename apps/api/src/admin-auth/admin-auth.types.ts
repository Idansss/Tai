import type { AdminAuthChallenge, AdminSession } from '@tms/contracts';

import type { AuthRequestContext, SessionCookieConfig } from '../auth/auth.types.js';

export interface AdminAuthConfig extends SessionCookieConfig {
  tokenPepper: string;
  challengeTtlSeconds: number;
  mfaEncryptionKey: Buffer;
}

export interface AdminAuthenticatedSession {
  token: string;
  session: AdminSession;
  permissionSet: ReadonlySet<string>;
}

export interface AdminSessionTokenResult {
  kind: 'SESSION';
  token: string;
  session: AdminSession;
}

export interface AdminChallengeResult {
  kind: 'CHALLENGE';
  challenge: AdminAuthChallenge;
}

export type AdminLoginResult = AdminSessionTokenResult | AdminChallengeResult;

export type AdminRequestContext = AuthRequestContext;
