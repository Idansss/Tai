import { Module } from '@nestjs/common';
import { loadEnvironment } from '@tms/configuration';
import { SmtpEmailProvider } from '@tms/email';

import { DatabaseService } from '../database/database.service.js';
import { AuthController } from './auth.controller.js';
import { AuthRateLimiterService } from './auth-rate-limiter.service.js';
import { AuthService } from './auth.service.js';
import { AUTH_CONFIG, AUTH_EMAIL_PROVIDER } from './auth.tokens.js';
import type { AuthConfig } from './auth.types.js';
import { SessionGuard } from './session.guard.js';

@Module({
  controllers: [AuthController],
  providers: [
    DatabaseService,
    AuthService,
    AuthRateLimiterService,
    SessionGuard,
    {
      provide: AUTH_CONFIG,
      useFactory: (): AuthConfig => {
        const environment = loadEnvironment();
        return {
          nodeEnvironment: environment.NODE_ENV,
          appPublicUrl: environment.APP_PUBLIC_URL,
          tokenPepper: environment.AUTH_TOKEN_PEPPER,
          cookieName: environment.AUTH_COOKIE_NAME,
          sessionTtlSeconds: environment.AUTH_SESSION_TTL_SECONDS,
          verificationTtlSeconds: environment.AUTH_VERIFICATION_TTL_SECONDS,
          resetTtlSeconds: environment.AUTH_RESET_TTL_SECONDS,
          rateLimitWindowSeconds: environment.AUTH_RATE_LIMIT_WINDOW_SECONDS,
          rateLimitMaxAttempts: environment.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
        };
      },
    },
    {
      provide: AUTH_EMAIL_PROVIDER,
      useFactory: () => {
        const environment = loadEnvironment();
        return new SmtpEmailProvider({
          smtpUrl: environment.SMTP_URL,
          from: environment.EMAIL_FROM,
        });
      },
    },
  ],
  exports: [AuthService, SessionGuard],
})
export class AuthModule {}
