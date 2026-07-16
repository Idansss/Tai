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
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { ApiResponse, AuthSession, AuthUser } from '@tms/contracts';
import type { Request, Response } from 'express';

import { clearSessionCookie, readCookie, setSessionCookie } from './auth-cookie.js';
import {
  AuthEmailDto,
  AuthTokenDto,
  ConfirmPasswordResetDto,
  LoginCustomerDto,
  RegisterCustomerDto,
} from './auth.dto.js';
import { AuthRateLimiterService } from './auth-rate-limiter.service.js';
import { AuthService } from './auth.service.js';
import { AUTH_CONFIG } from './auth.tokens.js';
import type { AuthConfig, AuthRequestContext } from './auth.types.js';
import { SessionGuard } from './session.guard.js';

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(AuthRateLimiterService) private readonly rateLimiter: AuthRateLimiterService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  @Post('register')
  @ApiBody({ type: RegisterCustomerDto })
  @ApiOperation({ summary: 'Register a customer account' })
  @ApiCreatedResponse({ description: 'The customer account was created.' })
  @ApiConflictResponse({ description: 'An account already exists for the email address.' })
  async register(
    @Body() input: RegisterCustomerDto,
    @Req() request: Request,
  ): Promise<ApiResponse<{ user: AuthUser; verificationRequired: true }>> {
    this.rateLimit(request, 'register', input.email);
    const user = await this.authService.register(input, this.requestContext(request));
    return this.respond(request, { user, verificationRequired: true });
  }

  @Post('login')
  @ApiBody({ type: LoginCustomerDto })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a customer session' })
  @ApiOkResponse({ description: 'The customer session was created.' })
  @ApiUnauthorizedResponse({ description: 'The credentials are invalid.' })
  async login(
    @Body() input: LoginCustomerDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponse<{ session: AuthSession }>> {
    this.rateLimit(request, 'login', input.email);
    const result = await this.authService.login(input, this.requestContext(request));
    setSessionCookie(response, result.token, this.config);
    return this.respond(request, { session: result.session });
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the current customer session' })
  @ApiNoContentResponse({ description: 'The current session was revoked when present.' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const token = readCookie(request.headers.cookie, this.config.cookieName);
    await this.authService.logout(token, this.requestContext(request));
    clearSessionCookie(response, this.config);
  }

  @Post('email-verification/request')
  @ApiBody({ type: AuthEmailDto })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request a customer email-verification link' })
  @ApiAcceptedResponse({ description: 'Accepted without disclosing account state.' })
  async requestEmailVerification(
    @Body() input: AuthEmailDto,
    @Req() request: Request,
  ): Promise<ApiResponse<{ accepted: true }>> {
    this.rateLimit(request, 'verification-request', input.email);
    await this.authService.requestEmailVerification(input, this.requestContext(request));
    return this.respond(request, { accepted: true });
  }

  @Post('email-verification/confirm')
  @ApiBody({ type: AuthTokenDto })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a customer email address and create a session' })
  @ApiOkResponse({ description: 'The email address was verified.' })
  async confirmEmailVerification(
    @Body() input: AuthTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponse<{ session: AuthSession }>> {
    this.rateLimit(request, 'verification-confirm');
    const result = await this.authService.confirmEmailVerification(
      input,
      this.requestContext(request),
    );
    setSessionCookie(response, result.token, this.config);
    return this.respond(request, { session: result.session });
  }

  @Post('password-reset/request')
  @ApiBody({ type: AuthEmailDto })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request a customer password-reset link' })
  @ApiAcceptedResponse({ description: 'Accepted without disclosing account state.' })
  async requestPasswordReset(
    @Body() input: AuthEmailDto,
    @Req() request: Request,
  ): Promise<ApiResponse<{ accepted: true }>> {
    this.rateLimit(request, 'password-reset-request', input.email);
    await this.authService.requestPasswordReset(input, this.requestContext(request));
    return this.respond(request, { accepted: true });
  }

  @Post('password-reset/confirm')
  @ApiBody({ type: ConfirmPasswordResetDto })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset a customer password and revoke every session' })
  @ApiNoContentResponse({ description: 'The password was reset and sessions were revoked.' })
  async confirmPasswordReset(
    @Body() input: ConfirmPasswordResetDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    this.rateLimit(request, 'password-reset-confirm');
    await this.authService.confirmPasswordReset(input, this.requestContext(request));
    clearSessionCookie(response, this.config);
  }

  @Get('session')
  @UseGuards(SessionGuard)
  @ApiCookieAuth('tms_session')
  @ApiOperation({ summary: 'Read the current customer session' })
  @ApiOkResponse({ description: 'The current authenticated session.' })
  getSession(@Req() request: Request): ApiResponse<{ session: AuthSession }> {
    return this.respond(request, { session: request.authSession!.session });
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionGuard)
  @ApiCookieAuth('tms_session')
  @ApiOperation({ summary: 'Revoke one session owned by the current customer' })
  @ApiNoContentResponse({ description: 'The owned session was revoked.' })
  async revokeSession(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.revokeSession(
      request.authSession!,
      sessionId,
      this.requestContext(request),
    );
    if (request.authSession!.session.id === sessionId) clearSessionCookie(response, this.config);
  }

  @Delete('sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionGuard)
  @ApiCookieAuth('tms_session')
  @ApiOperation({ summary: 'Revoke every session owned by the current customer' })
  @ApiNoContentResponse({ description: 'All customer sessions were revoked.' })
  async revokeAllSessions(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.revokeAllSessions(request.authSession!, this.requestContext(request));
    clearSessionCookie(response, this.config);
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

  private requestContext(request: Request): AuthRequestContext {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent'),
      correlationId: request.correlationId ?? 'unavailable',
    };
  }
}
