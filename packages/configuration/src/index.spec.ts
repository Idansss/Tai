import { describe, expect, it } from 'vitest';

import { loadEnvironment } from './index.js';

describe('loadEnvironment', () => {
  it('provides safe local defaults', () => {
    expect(loadEnvironment({})).toEqual({
      NODE_ENV: 'development',
      API_PORT: 4000,
      DATABASE_URL:
        'postgresql://tai:local_development_only@localhost:5432/tai_manic?schema=public',
      LOG_LEVEL: 'info',
      APP_PUBLIC_URL: 'http://localhost:3000',
      SMTP_URL: 'smtp://localhost:1025',
      REDIS_URL: 'redis://localhost:6379',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_REGION: 'us-east-1',
      S3_BUCKET: 'tai-manic-local',
      S3_ACCESS_KEY: 'minio',
      S3_SECRET_KEY: 'local_development_only',
      EMAIL_FROM: 'no-reply@taimanic.local',
      AUTH_TOKEN_PEPPER: 'local-development-auth-pepper-change-me',
      AUTH_COOKIE_NAME: 'tms_session',
      AUTH_SESSION_TTL_SECONDS: 2_592_000,
      AUTH_VERIFICATION_TTL_SECONDS: 86_400,
      AUTH_RESET_TTL_SECONDS: 3_600,
      AUTH_RATE_LIMIT_WINDOW_SECONDS: 60,
      AUTH_RATE_LIMIT_MAX_ATTEMPTS: 5,
      ADMIN_AUTH_COOKIE_NAME: 'tms_admin_session',
      ADMIN_AUTH_SESSION_TTL_SECONDS: 28_800,
      ADMIN_MFA_CHALLENGE_TTL_SECONDS: 300,
      ADMIN_MFA_ENCRYPTION_KEY: 'bG9jYWwtZGV2ZWxvcG1lbnQtbWZhLWtleS0xMjM0NTY',
    });
  });

  it('rejects invalid ports', () => {
    expect(() => loadEnvironment({ API_PORT: '70000' })).toThrow();
  });

  it('requires a deployment-specific authentication pepper in production', () => {
    expect(() => loadEnvironment({ NODE_ENV: 'production' })).toThrow(
      'AUTH_TOKEN_PEPPER must be replaced in production.',
    );
  });

  it('requires a deployment-specific MFA encryption key in production', () => {
    expect(() =>
      loadEnvironment({
        NODE_ENV: 'production',
        AUTH_TOKEN_PEPPER: 'a-production-authentication-pepper',
      }),
    ).toThrow('ADMIN_MFA_ENCRYPTION_KEY must be replaced in production.');
  });

  it('requires a real malware scanner hook in production', () => {
    expect(() =>
      loadEnvironment({
        NODE_ENV: 'production',
        AUTH_TOKEN_PEPPER: 'a-production-authentication-pepper',
        ADMIN_MFA_ENCRYPTION_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      }),
    ).toThrow('MEDIA_MALWARE_SCAN_URL is required in production.');
  });
});
