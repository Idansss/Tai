import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { readCookie } from '../auth/auth-cookie.js';
import { ApiProblemException } from '../platform/api-problem.exception.js';
import { AdminAuthService } from './admin-auth.service.js';
import { ADMIN_AUTH_CONFIG } from './admin-auth.tokens.js';
import type { AdminAuthConfig } from './admin-auth.types.js';

@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(
    @Inject(AdminAuthService) private readonly adminAuthService: AdminAuthService,
    @Inject(ADMIN_AUTH_CONFIG) private readonly config: AdminAuthConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = readCookie(request.headers.cookie, this.config.cookieName);
    const authenticated = token ? await this.adminAuthService.validateSession(token) : null;
    if (!authenticated) {
      throw new ApiProblemException(
        'SESSION_INVALID',
        HttpStatus.UNAUTHORIZED,
        'Sign in to the administration console to continue.',
      );
    }
    request.adminSession = authenticated;
    return true;
  }
}
