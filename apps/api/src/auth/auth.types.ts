import type { AuthSession, AuthUser } from '@tms/contracts';

export interface AuthConfig {
  nodeEnvironment: 'development' | 'test' | 'production';
  appPublicUrl: string;
  tokenPepper: string;
  cookieName: string;
  sessionTtlSeconds: number;
  verificationTtlSeconds: number;
  resetTtlSeconds: number;
  rateLimitWindowSeconds: number;
  rateLimitMaxAttempts: number;
}

export interface SessionCookieConfig {
  nodeEnvironment: 'development' | 'test' | 'production';
  cookieName: string;
  sessionTtlSeconds: number;
}

export interface SessionTokenResult {
  token: string;
  session: AuthSession;
}

export interface AuthRequestContext {
  ipAddress?: string;
  userAgent?: string;
  correlationId: string;
}

export interface AuthenticatedSession {
  token: string;
  session: AuthSession;
}

export type PublicAuthUser = AuthUser;
