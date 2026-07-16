import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type {
  AuthEmailInput,
  AuthSession,
  AuthTokenInput,
  AuthUser,
  CustomerLoginInput,
  CustomerRegistrationInput,
  PasswordResetConfirmationInput,
} from '@tms/contracts';
import { Prisma, SessionKind, UserStatus } from '@tms/database';
import type { EmailProvider } from '@tms/email';

import { DatabaseService } from '../database/database.service.js';
import { ApiProblemException } from '../platform/api-problem.exception.js';
import {
  createOpaqueToken,
  hashOpaqueValue,
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from './auth-crypto.js';
import { AUTH_CONFIG, AUTH_EMAIL_PROVIDER } from './auth.tokens.js';
import type {
  AuthConfig,
  AuthRequestContext,
  AuthenticatedSession,
  SessionTokenResult,
} from './auth.types.js';

type AuthUserRecord = {
  id: string;
  email: string;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  customerProfile: { displayName: string | null } | null;
};

@Injectable()
export class AuthService {
  private readonly dummyPasswordHash = hashPassword('not-a-real-customer-password');

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AUTH_EMAIL_PROVIDER) private readonly emailProvider: EmailProvider,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  async register(input: CustomerRegistrationInput, context: AuthRequestContext): Promise<AuthUser> {
    const email = normalizeEmail(input.email);
    const passwordHash = await hashPassword(input.password);
    const token = createOpaqueToken();
    const now = new Date();

    let user: AuthUserRecord;
    try {
      user = await this.database.client.$transaction(async (transaction) => {
        const created = await transaction.user.create({
          data: {
            email,
            normalizedEmail: email,
            passwordHash,
            customerProfile: {
              create: { displayName: input.displayName?.trim() || null },
            },
          },
          include: { customerProfile: { select: { displayName: true } } },
        });
        await transaction.emailVerificationToken.create({
          data: {
            userId: created.id,
            tokenHash: this.hashToken(token),
            expiresAt: this.addSeconds(now, this.config.verificationTtlSeconds),
          },
        });
        await this.writeAudit(transaction, {
          actorUserId: created.id,
          action: 'auth.register',
          resourceId: created.id,
          outcome: 'SUCCESS',
          context,
        });
        return created;
      });
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        throw new ApiProblemException(
          'CONFLICT',
          HttpStatus.CONFLICT,
          'An account already exists for this email address.',
        );
      }
      throw error;
    }

    try {
      await this.sendActionEmail('auth-email-verification', email, token);
    } catch {
      await this.recordEmailFailure(user.id, 'auth.verification.delivery_failed', context);
      throw new ApiProblemException(
        'INTEGRATION_UNAVAILABLE',
        HttpStatus.SERVICE_UNAVAILABLE,
        'The account was created, but the verification email could not be sent. Please request another email.',
      );
    }

    return this.toAuthUser(user);
  }

  async login(input: CustomerLoginInput, context: AuthRequestContext): Promise<SessionTokenResult> {
    const normalizedEmail = normalizeEmail(input.email);
    const user = await this.database.client.user.findUnique({
      where: { normalizedEmail },
      include: { customerProfile: { select: { displayName: true } } },
    });
    const candidateHash = user?.passwordHash ?? (await this.dummyPasswordHash);
    const passwordMatches = await verifyPassword(input.password, candidateHash);

    if (!user || !user.customerProfile || !user.passwordHash || !passwordMatches) {
      await this.recordLoginFailure(user?.id, context, 'invalid_credentials');
      throw new ApiProblemException(
        'AUTHENTICATION_INVALID',
        HttpStatus.UNAUTHORIZED,
        'The email address or password is incorrect.',
      );
    }
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      await this.recordLoginFailure(user.id, context, 'email_unverified');
      throw new ApiProblemException(
        'EMAIL_VERIFICATION_REQUIRED',
        HttpStatus.FORBIDDEN,
        'Verify your email address before signing in.',
      );
    }
    if (user.status !== UserStatus.ACTIVE) {
      await this.recordLoginFailure(user.id, context, 'account_unavailable');
      throw new ApiProblemException(
        'AUTHENTICATION_INVALID',
        HttpStatus.UNAUTHORIZED,
        'The email address or password is incorrect.',
      );
    }

    const result = await this.createSession(user, context, 'auth.login');
    await this.database.client.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return result;
  }

  async requestEmailVerification(
    input: AuthEmailInput,
    context: AuthRequestContext,
  ): Promise<void> {
    const user = await this.database.client.user.findUnique({
      where: { normalizedEmail: normalizeEmail(input.email) },
      include: { customerProfile: { select: { displayName: true } } },
    });
    if (!user?.customerProfile || user.status !== UserStatus.PENDING_VERIFICATION) return;

    const token = createOpaqueToken();
    const now = new Date();
    await this.database.client.$transaction(async (transaction) => {
      await transaction.emailVerificationToken.deleteMany({
        where: { userId: user.id, consumedAt: null },
      });
      await transaction.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashToken(token),
          expiresAt: this.addSeconds(now, this.config.verificationTtlSeconds),
        },
      });
      await this.writeAudit(transaction, {
        actorUserId: user.id,
        action: 'auth.verification.request',
        resourceId: user.id,
        outcome: 'SUCCESS',
        context,
      });
    });

    try {
      await this.sendActionEmail('auth-email-verification', user.email, token);
    } catch {
      await this.recordEmailFailure(user.id, 'auth.verification.delivery_failed', context);
    }
  }

  async confirmEmailVerification(
    input: AuthTokenInput,
    context: AuthRequestContext,
  ): Promise<SessionTokenResult> {
    const now = new Date();
    const record = await this.database.client.emailVerificationToken.findUnique({
      where: { tokenHash: this.hashToken(input.token) },
      include: {
        user: { include: { customerProfile: { select: { displayName: true } } } },
      },
    });
    if (
      !record ||
      record.consumedAt ||
      record.expiresAt <= now ||
      record.user.status !== UserStatus.PENDING_VERIFICATION ||
      !record.user.customerProfile
    ) {
      throw this.invalidTokenProblem();
    }

    const sessionToken = createOpaqueToken();
    const sessionExpiresAt = this.addSeconds(now, this.config.sessionTtlSeconds);
    const result = await this.database.client.$transaction(async (transaction) => {
      const consumed = await transaction.emailVerificationToken.updateMany({
        where: { id: record.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) throw this.invalidTokenProblem();

      const user = await transaction.user.update({
        where: { id: record.userId },
        data: { status: UserStatus.ACTIVE, emailVerifiedAt: now },
        include: { customerProfile: { select: { displayName: true } } },
      });
      const session = await transaction.session.create({
        data: this.sessionCreateData(user.id, sessionToken, sessionExpiresAt, context),
      });
      await this.writeAudit(transaction, {
        actorUserId: user.id,
        action: 'auth.verification.confirm',
        resourceId: user.id,
        outcome: 'SUCCESS',
        context,
      });
      return { session, user };
    });

    return {
      token: sessionToken,
      session: this.toAuthSession(result.session.id, result.session.expiresAt, result.user),
    };
  }

  async requestPasswordReset(input: AuthEmailInput, context: AuthRequestContext): Promise<void> {
    const user = await this.database.client.user.findUnique({
      where: { normalizedEmail: normalizeEmail(input.email) },
      include: { customerProfile: { select: { displayName: true } } },
    });
    if (!user?.customerProfile || user.status !== UserStatus.ACTIVE) return;

    const token = createOpaqueToken();
    const now = new Date();
    await this.database.client.$transaction(async (transaction) => {
      await transaction.passwordResetToken.deleteMany({
        where: { userId: user.id, consumedAt: null },
      });
      await transaction.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashToken(token),
          expiresAt: this.addSeconds(now, this.config.resetTtlSeconds),
        },
      });
      await this.writeAudit(transaction, {
        actorUserId: user.id,
        action: 'auth.password_reset.request',
        resourceId: user.id,
        outcome: 'SUCCESS',
        context,
      });
    });

    try {
      await this.sendActionEmail('auth-password-reset', user.email, token);
    } catch {
      await this.recordEmailFailure(user.id, 'auth.password_reset.delivery_failed', context);
    }
  }

  async confirmPasswordReset(
    input: PasswordResetConfirmationInput,
    context: AuthRequestContext,
  ): Promise<void> {
    const now = new Date();
    const record = await this.database.client.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(input.token) },
      include: { user: { include: { customerProfile: true } } },
    });
    if (
      !record ||
      record.consumedAt ||
      record.expiresAt <= now ||
      record.user.status !== UserStatus.ACTIVE ||
      !record.user.customerProfile
    ) {
      throw this.invalidTokenProblem();
    }

    const passwordHash = await hashPassword(input.password);
    await this.database.client.$transaction(async (transaction) => {
      const consumed = await transaction.passwordResetToken.updateMany({
        where: { id: record.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) throw this.invalidTokenProblem();

      await transaction.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });
      await transaction.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: now, revocationReason: 'password_reset' },
      });
      await transaction.adminAuthChallenge.deleteMany({ where: { userId: record.userId } });
      await this.writeAudit(transaction, {
        actorUserId: record.userId,
        action: 'auth.password_reset.confirm',
        resourceId: record.userId,
        outcome: 'SUCCESS',
        context,
      });
    });
  }

  async validateSession(token: string): Promise<AuthenticatedSession | null> {
    const now = new Date();
    const record = await this.database.client.session.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: {
        user: { include: { customerProfile: { select: { displayName: true } } } },
      },
    });
    if (
      !record ||
      record.kind !== SessionKind.CUSTOMER ||
      record.revokedAt ||
      record.expiresAt <= now ||
      record.user.status !== UserStatus.ACTIVE ||
      !record.user.customerProfile
    ) {
      return null;
    }

    await this.database.client.session.update({
      where: { id: record.id },
      data: { lastSeenAt: now },
    });
    return {
      token,
      session: this.toAuthSession(record.id, record.expiresAt, record.user),
    };
  }

  async logout(token: string | undefined, context: AuthRequestContext): Promise<void> {
    if (!token) return;
    const now = new Date();
    const record = await this.database.client.session.findUnique({
      where: { tokenHash: this.hashToken(token) },
      select: { id: true, userId: true, kind: true, revokedAt: true },
    });
    if (!record || record.kind !== SessionKind.CUSTOMER || record.revokedAt) return;

    await this.database.client.$transaction(async (transaction) => {
      await transaction.session.update({
        where: { id: record.id },
        data: { revokedAt: now, revocationReason: 'logout' },
      });
      await this.writeAudit(transaction, {
        actorUserId: record.userId,
        action: 'auth.logout',
        resourceId: record.id,
        outcome: 'SUCCESS',
        context,
      });
    });
  }

  async revokeSession(
    authenticated: AuthenticatedSession,
    sessionId: string,
    context: AuthRequestContext,
  ): Promise<void> {
    const now = new Date();
    const result = await this.database.client.$transaction(async (transaction) => {
      const revoked = await transaction.session.updateMany({
        where: {
          id: sessionId,
          userId: authenticated.session.user.id,
          kind: SessionKind.CUSTOMER,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now, revocationReason: 'customer_revoked' },
      });
      if (revoked.count === 1) {
        await this.writeAudit(transaction, {
          actorUserId: authenticated.session.user.id,
          action: 'auth.session.revoke',
          resourceId: sessionId,
          outcome: 'SUCCESS',
          context,
        });
      }
      return revoked.count;
    });
    if (result !== 1) {
      throw new ApiProblemException(
        'RESOURCE_NOT_FOUND',
        HttpStatus.NOT_FOUND,
        'The session was not found.',
      );
    }
  }

  async revokeAllSessions(
    authenticated: AuthenticatedSession,
    context: AuthRequestContext,
  ): Promise<void> {
    const now = new Date();
    await this.database.client.$transaction(async (transaction) => {
      await transaction.session.updateMany({
        where: {
          userId: authenticated.session.user.id,
          kind: SessionKind.CUSTOMER,
          revokedAt: null,
        },
        data: { revokedAt: now, revocationReason: 'customer_revoked_all' },
      });
      await this.writeAudit(transaction, {
        actorUserId: authenticated.session.user.id,
        action: 'auth.session.revoke_all',
        resourceId: authenticated.session.user.id,
        outcome: 'SUCCESS',
        context,
      });
    });
  }

  private async createSession(
    user: AuthUserRecord,
    context: AuthRequestContext,
    auditAction: string,
  ): Promise<SessionTokenResult> {
    const token = createOpaqueToken();
    const expiresAt = this.addSeconds(new Date(), this.config.sessionTtlSeconds);
    const session = await this.database.client.$transaction(async (transaction) => {
      const created = await transaction.session.create({
        data: this.sessionCreateData(user.id, token, expiresAt, context),
      });
      await this.writeAudit(transaction, {
        actorUserId: user.id,
        action: auditAction,
        resourceId: created.id,
        outcome: 'SUCCESS',
        context,
      });
      return created;
    });
    return { token, session: this.toAuthSession(session.id, session.expiresAt, user) };
  }

  private sessionCreateData(
    userId: string,
    token: string,
    expiresAt: Date,
    context: AuthRequestContext,
  ) {
    return {
      userId,
      kind: SessionKind.CUSTOMER,
      tokenHash: this.hashToken(token),
      expiresAt,
      ipAddressHash: context.ipAddress
        ? hashOpaqueValue(context.ipAddress, this.config.tokenPepper)
        : null,
      userAgent: context.userAgent?.slice(0, 500) || null,
    };
  }

  private async recordLoginFailure(
    actorUserId: string | undefined,
    context: AuthRequestContext,
    reason: string,
  ): Promise<void> {
    await this.database.client.auditLog.create({
      data: {
        actorType: actorUserId ? 'USER' : 'SYSTEM',
        actorUserId,
        action: 'auth.login',
        resourceType: 'session',
        outcome: 'FAILURE',
        correlationId: context.correlationId,
        ipAddressHash: context.ipAddress
          ? hashOpaqueValue(context.ipAddress, this.config.tokenPepper)
          : null,
        metadata: { reason },
      },
    });
  }

  private async recordEmailFailure(
    actorUserId: string,
    action: string,
    context: AuthRequestContext,
  ): Promise<void> {
    await this.database.client.auditLog.create({
      data: {
        actorType: 'USER',
        actorUserId,
        action,
        resourceType: 'user',
        resourceId: actorUserId,
        outcome: 'FAILURE',
        correlationId: context.correlationId,
      },
    });
  }

  private async writeAudit(
    transaction: Prisma.TransactionClient,
    input: {
      actorUserId: string;
      action: string;
      resourceId: string;
      outcome: 'SUCCESS' | 'FAILURE' | 'DENIED';
      context: AuthRequestContext;
    },
  ): Promise<void> {
    await transaction.auditLog.create({
      data: {
        actorType: 'USER',
        actorUserId: input.actorUserId,
        action: input.action,
        resourceType: 'user',
        resourceId: input.resourceId,
        outcome: input.outcome,
        correlationId: input.context.correlationId,
        ipAddressHash: input.context.ipAddress
          ? hashOpaqueValue(input.context.ipAddress, this.config.tokenPepper)
          : null,
      },
    });
  }

  private async sendActionEmail(
    template: 'auth-email-verification' | 'auth-password-reset',
    email: string,
    token: string,
  ): Promise<void> {
    const path =
      template === 'auth-email-verification' ? '/account/verify-email' : '/account/reset-password';
    const actionUrl = new URL(path, this.config.appPublicUrl);
    actionUrl.searchParams.set('token', token);
    await this.emailProvider.send({
      to: email,
      template,
      variables: { actionUrl: actionUrl.toString() },
    });
  }

  private hashToken(token: string): string {
    return hashOpaqueValue(token, this.config.tokenPepper);
  }

  private addSeconds(date: Date, seconds: number): Date {
    return new Date(date.getTime() + seconds * 1_000);
  }

  private invalidTokenProblem(): ApiProblemException {
    return new ApiProblemException(
      'TOKEN_INVALID_OR_EXPIRED',
      HttpStatus.BAD_REQUEST,
      'This link is invalid or expired.',
    );
  }

  private isUniqueConstraint(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private toAuthUser(user: AuthUserRecord): AuthUser {
    return {
      id: user.id,
      email: user.email,
      status: user.status === UserStatus.ACTIVE ? 'ACTIVE' : 'PENDING_VERIFICATION',
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      displayName: user.customerProfile?.displayName ?? null,
    };
  }

  private toAuthSession(id: string, expiresAt: Date, user: AuthUserRecord): AuthSession {
    return { id, expiresAt: expiresAt.toISOString(), user: this.toAuthUser(user) };
  }
}
