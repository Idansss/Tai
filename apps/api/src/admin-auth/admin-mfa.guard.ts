import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { ApiProblemException } from '../platform/api-problem.exception.js';
import { ADMIN_MFA_METADATA } from './admin-auth.tokens.js';

@Injectable()
export class AdminMfaGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(ADMIN_MFA_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest<Request>();
    if (request.adminSession?.session.assuranceLevel !== 'MFA') {
      throw new ApiProblemException(
        'ADMIN_MFA_REQUIRED',
        HttpStatus.FORBIDDEN,
        'Multi-factor authentication is required for this action.',
      );
    }
    return true;
  }
}
