import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { ApiProblemException } from '../platform/api-problem.exception.js';
import { AdminAuthService } from './admin-auth.service.js';
import { ADMIN_PERMISSION_METADATA } from './admin-auth.tokens.js';

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AdminAuthService) private readonly adminAuthService: AdminAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(ADMIN_PERMISSION_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const authenticated = request.adminSession;
    const missing = required.filter((permission) => !authenticated?.permissionSet.has(permission));
    if (!authenticated || missing.length > 0) {
      if (authenticated) {
        await this.adminAuthService.recordAuthorizationDenied(authenticated, missing, {
          correlationId: request.correlationId ?? 'unavailable',
          ipAddress: request.ip,
          userAgent: request.header('user-agent'),
        });
      }
      throw new ApiProblemException(
        'PERMISSION_DENIED',
        HttpStatus.FORBIDDEN,
        'You do not have permission to perform this action.',
      );
    }
    return true;
  }
}
