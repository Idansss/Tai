import { Module } from '@nestjs/common';
import { loadEnvironment } from '@tms/configuration';

import { AuthModule } from '../auth/auth.module.js';
import { DatabaseService } from '../database/database.service.js';
import { AdminAuthController } from './admin-auth.controller.js';
import { AdminAuthService } from './admin-auth.service.js';
import { ADMIN_AUTH_CONFIG } from './admin-auth.tokens.js';
import type { AdminAuthConfig } from './admin-auth.types.js';
import { AdminMfaGuard } from './admin-mfa.guard.js';
import { AdminPermissionGuard } from './admin-permission.guard.js';
import { AdminSessionGuard } from './admin-session.guard.js';

@Module({
  imports: [AuthModule],
  controllers: [AdminAuthController],
  providers: [
    DatabaseService,
    AdminAuthService,
    AdminSessionGuard,
    AdminPermissionGuard,
    AdminMfaGuard,
    {
      provide: ADMIN_AUTH_CONFIG,
      useFactory: (): AdminAuthConfig => {
        const environment = loadEnvironment();
        return {
          nodeEnvironment: environment.NODE_ENV,
          tokenPepper: environment.AUTH_TOKEN_PEPPER,
          cookieName: environment.ADMIN_AUTH_COOKIE_NAME,
          sessionTtlSeconds: environment.ADMIN_AUTH_SESSION_TTL_SECONDS,
          challengeTtlSeconds: environment.ADMIN_MFA_CHALLENGE_TTL_SECONDS,
          mfaEncryptionKey: Buffer.from(environment.ADMIN_MFA_ENCRYPTION_KEY, 'base64url'),
        };
      },
    },
  ],
  exports: [AdminAuthService, AdminSessionGuard, AdminPermissionGuard, AdminMfaGuard],
})
export class AdminAuthModule {}
