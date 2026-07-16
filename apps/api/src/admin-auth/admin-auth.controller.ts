import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type {
  AdminAuthChallenge,
  AdminRole,
  AdminSession,
  AdminTotpEnrollment,
  ApiResponse,
} from '@tms/contracts';
import type { Request, Response } from 'express';

import { AuthRateLimiterService } from '../auth/auth-rate-limiter.service.js';
import { clearSessionCookie, readCookie, setSessionCookie } from '../auth/auth-cookie.js';
import {
  AdminLoginDto,
  AdminMfaChallengeDto,
  AdminMfaCodeDto,
  AdminRoleAssignmentDto,
} from './admin-auth.dto.js';
import { AdminAuthService } from './admin-auth.service.js';
import { ADMIN_AUTH_CONFIG } from './admin-auth.tokens.js';
import type { AdminAuthConfig, AdminRequestContext } from './admin-auth.types.js';
import { RequireAdminMfa, RequireAdminPermissions } from './admin-authorization.js';
import { AdminMfaGuard } from './admin-mfa.guard.js';
import { AdminPermissionGuard } from './admin-permission.guard.js';
import { AdminSessionGuard } from './admin-session.guard.js';

@ApiTags('admin-authentication')
@Controller('admin')
export class AdminAuthController {
  constructor(
    @Inject(AdminAuthService) private readonly adminAuthService: AdminAuthService,
    @Inject(AuthRateLimiterService) private readonly rateLimiter: AuthRateLimiterService,
    @Inject(ADMIN_AUTH_CONFIG) private readonly config: AdminAuthConfig,
  ) {}

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: AdminLoginDto })
  @ApiOperation({
    operationId: 'loginAdministrator',
    summary: 'Authenticate an administrator or begin the required MFA flow',
  })
  @ApiOkResponse({ description: 'A session or MFA challenge was created.' })
  @ApiUnauthorizedResponse({ description: 'The credentials are invalid.' })
  async login(
    @Body() input: AdminLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponse<{ session: AdminSession } | { challenge: AdminAuthChallenge }>> {
    this.rateLimit(request, 'admin-login', input.email);
    const result = await this.adminAuthService.login(input, this.requestContext(request));
    if (result.kind === 'CHALLENGE') return this.respond(request, { challenge: result.challenge });
    setSessionCookie(response, result.token, this.config);
    return this.respond(request, { session: result.session });
  }

  @Post('auth/mfa/enroll')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: AdminMfaChallengeDto })
  @ApiOperation({
    operationId: 'beginAdministratorMfaEnrollment',
    summary: 'Create a TOTP factor for a password-verified administrator',
  })
  @ApiOkResponse({ description: 'The one-time TOTP enrollment secret was returned.' })
  async beginMfaEnrollment(
    @Body() input: AdminMfaChallengeDto,
    @Req() request: Request,
  ): Promise<ApiResponse<{ enrollment: AdminTotpEnrollment }>> {
    this.rateLimit(request, 'admin-mfa-enroll');
    const enrollment = await this.adminAuthService.beginTotpEnrollment(
      input.challengeToken,
      this.requestContext(request),
    );
    return this.respond(request, { enrollment });
  }

  @Post('auth/mfa/enroll/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: AdminMfaCodeDto })
  @ApiOperation({
    operationId: 'confirmAdministratorMfaEnrollment',
    summary: 'Confirm TOTP enrollment and create an MFA-assured session',
  })
  @ApiOkResponse({ description: 'TOTP was enrolled and the administration session was created.' })
  async confirmMfaEnrollment(
    @Body() input: AdminMfaCodeDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponse<{ session: AdminSession }>> {
    this.rateLimit(request, 'admin-mfa-confirm');
    const result = await this.adminAuthService.confirmTotpEnrollment(
      input.challengeToken,
      input.code,
      this.requestContext(request),
    );
    setSessionCookie(response, result.token, this.config);
    return this.respond(request, { session: result.session });
  }

  @Post('auth/mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: AdminMfaCodeDto })
  @ApiOperation({
    operationId: 'verifyAdministratorMfa',
    summary: 'Complete an administrator TOTP challenge',
  })
  @ApiOkResponse({ description: 'The administration session was created.' })
  async verifyMfa(
    @Body() input: AdminMfaCodeDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponse<{ session: AdminSession }>> {
    this.rateLimit(request, 'admin-mfa-verify');
    const result = await this.adminAuthService.verifyTotpChallenge(
      input.challengeToken,
      input.code,
      this.requestContext(request),
    );
    setSessionCookie(response, result.token, this.config);
    return this.respond(request, { session: result.session });
  }

  @Post('auth/logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'logoutAdministrator',
    summary: 'Revoke the current administration session',
  })
  @ApiNoContentResponse({ description: 'The session was revoked when present.' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const token = readCookie(request.headers.cookie, this.config.cookieName);
    await this.adminAuthService.logout(token, this.requestContext(request));
    clearSessionCookie(response, this.config);
  }

  @Get('auth/session')
  @UseGuards(AdminSessionGuard)
  @ApiCookieAuth('tms_admin_session')
  @ApiOperation({
    operationId: 'getAdministratorSession',
    summary: 'Read the current administrator, roles, and permissions',
  })
  @ApiOkResponse({ description: 'The current administration session.' })
  getSession(@Req() request: Request): ApiResponse<{ session: AdminSession }> {
    return this.respond(request, { session: request.adminSession!.session });
  }

  @Delete('auth/sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminSessionGuard)
  @ApiCookieAuth('tms_admin_session')
  @ApiOperation({
    operationId: 'revokeAdministratorSession',
    summary: 'Revoke an owned administration session or, with authority, another',
  })
  @ApiNoContentResponse({ description: 'The administration session was revoked.' })
  async revokeSession(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.adminAuthService.revokeSession(
      request.adminSession!,
      sessionId,
      this.requestContext(request),
    );
    if (request.adminSession!.session.id === sessionId) clearSessionCookie(response, this.config);
  }

  @Get('access/roles')
  @UseGuards(AdminSessionGuard, AdminPermissionGuard)
  @RequireAdminPermissions('users.read')
  @ApiCookieAuth('tms_admin_session')
  @ApiOperation({
    operationId: 'listAdministratorRoles',
    summary: 'List administrative roles and their permissions',
  })
  @ApiOkResponse({ description: 'Administrative roles and permissions.' })
  async listRoles(@Req() request: Request): Promise<ApiResponse<{ roles: AdminRole[] }>> {
    return this.respond(request, { roles: await this.adminAuthService.listRoles() });
  }

  @Put('access/users/:userId/roles/:roleCode')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminSessionGuard, AdminPermissionGuard, AdminMfaGuard)
  @RequireAdminPermissions('system.manage')
  @RequireAdminMfa()
  @ApiCookieAuth('tms_admin_session')
  @ApiBody({ type: AdminRoleAssignmentDto })
  @ApiOperation({
    operationId: 'assignAdministratorRole',
    summary: 'Assign an administrative role',
  })
  @ApiNoContentResponse({ description: 'The role assignment is active.' })
  async assignRole(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('roleCode') roleCode: string,
    @Body() input: AdminRoleAssignmentDto,
    @Req() request: Request,
  ): Promise<void> {
    await this.adminAuthService.assignRole(
      request.adminSession!,
      userId,
      roleCode,
      input,
      this.requestContext(request),
    );
  }

  @Delete('access/users/:userId/roles/:roleCode')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminSessionGuard, AdminPermissionGuard, AdminMfaGuard)
  @RequireAdminPermissions('system.manage')
  @RequireAdminMfa()
  @ApiCookieAuth('tms_admin_session')
  @ApiOperation({
    operationId: 'revokeAdministratorRole',
    summary: 'Revoke an administrative role',
  })
  @ApiNoContentResponse({ description: 'The role assignment was removed.' })
  async revokeRole(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('roleCode') roleCode: string,
    @Req() request: Request,
  ): Promise<void> {
    await this.adminAuthService.revokeRole(
      request.adminSession!,
      userId,
      roleCode,
      this.requestContext(request),
    );
  }

  private respond<T>(request: Request, data: T): ApiResponse<T> {
    return { data, meta: { correlationId: request.correlationId ?? 'unavailable' } };
  }

  private rateLimit(request: Request, scope: string, email?: string): void {
    this.rateLimiter.consume(
      scope,
      `${request.ip ?? 'unknown'}:${email?.trim().toLowerCase() ?? ''}`,
    );
  }

  private requestContext(request: Request): AdminRequestContext {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent'),
      correlationId: request.correlationId ?? 'unavailable',
    };
  }
}
