import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { ApiProblemException } from '../platform/api-problem.exception.js';
import { readCookie } from './auth-cookie.js';
import { AuthService } from './auth.service.js';
import { AUTH_CONFIG } from './auth.tokens.js';
import type { AuthConfig } from './auth.types.js';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = readCookie(request.headers.cookie, this.config.cookieName);
    const authenticated = token ? await this.authService.validateSession(token) : null;
    if (!authenticated) {
      throw new ApiProblemException(
        'SESSION_INVALID',
        HttpStatus.UNAUTHORIZED,
        'Sign in to continue.',
      );
    }
    request.authSession = authenticated;
    return true;
  }
}
