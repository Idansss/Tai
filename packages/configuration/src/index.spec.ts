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
      EMAIL_FROM: 'no-reply@taimanic.local',
      AUTH_TOKEN_PEPPER: 'local-development-auth-pepper-change-me',
      AUTH_COOKIE_NAME: 'tms_session',
      AUTH_SESSION_TTL_SECONDS: 2_592_000,
      AUTH_VERIFICATION_TTL_SECONDS: 86_400,
      AUTH_RESET_TTL_SECONDS: 3_600,
      AUTH_RATE_LIMIT_WINDOW_SECONDS: 60,
      AUTH_RATE_LIMIT_MAX_ATTEMPTS: 5,
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
});
