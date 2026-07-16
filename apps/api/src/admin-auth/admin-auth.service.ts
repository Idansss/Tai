import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type {
  AdminAuthChallenge,
  AdminLoginInput,
  AdminRole,
  AdminRoleAssignmentInput,
  AdminSession,
  AdminTotpEnrollment,
  AdminUser,
} from '@tms/contracts';
import {
  AdminMfaFactorStatus,
  AdminProfileStatus,
  AuthAssuranceLevel,
  SessionKind,
  UserStatus,
} from '@tms/database';
import type { Prisma } from '@tms/database';

import {
  createOpaqueToken,
  hashOpaqueValue,
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from '../auth/auth-crypto.js';
import { DatabaseService } from '../database/database.service.js';
import { ApiProblemException } from '../platform/api-problem.exception.js';
import {
  buildTotpUri,
  decryptMfaSecret,
  encryptMfaSecret,
  generateTotpSecret,
  verifyTotp,
} from './admin-mfa.js';
import { ADMIN_AUTH_CONFIG } from './admin-auth.tokens.js';
import type {
  AdminAuthenticatedSession,
  AdminAuthConfig,
  AdminChallengeResult,
  AdminLoginResult,
  AdminRequestContext,
  AdminSessionTokenResult,
} from './admin-auth.types.js';

type AdminUserRecord = {
  id: string;
  email: string;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  passwordHash: string | null;
  adminProfile: {
    displayName: string;
    status: AdminProfileStatus;
    mfaRequired: boolean;
    mfaEnrolledAt: Date | null;
  } | null;
  roleAssignments: Array<{
    role: {
      code: string;
      permissions: Array<{ permission: { code: string } }>;
    };
  }>;
};

@Injectable()
export class AdminAuthService {
  private readonly dummyPasswordHash = hashPassword('not-a-real-administrator-password');

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ADMIN_AUTH_CONFIG) private readonly config: AdminAuthConfig,
  ) {}

  async login(input: AdminLoginInput, context: AdminRequestContext): Promise<AdminLoginResult> {
    const user = await this.loadAdminUserByEmail(normalizeEmail(input.email));
    const candidateHash = user?.passwordHash ?? (await this.dummyPasswordHash);
    const passwordMatches = await verifyPassword(input.password, candidateHash);

    if (!this.canAuthenticate(user) || !passwordMatches) {
      await this.recordLoginFailure(user?.id, context);
      throw this.invalidCredentialsProblem();
    }

    if (user.adminProfile.mfaRequired) {
      const factor = await this.database.client.adminMfaFactor.findUnique({
        where: { userId: user.id },
        select: { status: true },
      });
      const purpose =
        factor?.status === AdminMfaFactorStatus.ACTIVE ? 'VERIFY_TOTP' : 'ENROLL_TOTP';
      return this.createChallenge(user.id, purpose, context);
    }

    return this.createAdminSession(user, AuthAssuranceLevel.PASSWORD, null, context, 'admin.login');
  }

  async beginTotpEnrollment(
    challengeToken: string,
    context: AdminRequestContext,
  ): Promise<AdminTotpEnrollment> {
    const challenge = await this.requireChallenge(challengeToken, 'ENROLL_TOTP');
    const user = await this.requireAdminUser(challenge.userId);
    const secret = generateTotpSecret();
    await this.database.client.$transaction(async (transaction) => {
      await transaction.adminMfaFactor.upsert({
        where: { userId: challenge.userId },
        update: {
          status: AdminMfaFactorStatus.PENDING,
          secretCiphertext: encryptMfaSecret(secret, this.config.mfaEncryptionKey),
          verifiedAt: null,
          revokedAt: null,
          lastUsedTimeStep: null,
        },
        create: {
          userId: challenge.userId,
          secretCiphertext: encryptMfaSecret(secret, this.config.mfaEncryptionKey),
        },
      });
      await this.writeAudit(transaction, {
        actorUserId: challenge.userId,
        action: 'admin.mfa.enrollment_started',
        resourceType: 'admin_mfa_factor',
        resourceId: challenge.userId,
        outcome: 'SUCCESS',
        context,
      });
    });
    return { secret, otpauthUri: buildTotpUri(user.email, secret) };
  }

  async confirmTotpEnrollment(
    challengeToken: string,
    code: string,
    context: AdminRequestContext,
  ): Promise<AdminSessionTokenResult> {
    const challenge = await this.requireChallenge(challengeToken, 'ENROLL_TOTP');
    await this.requireAdminUser(challenge.userId);
    const factor = await this.database.client.adminMfaFactor.findUnique({
      where: { userId: challenge.userId },
    });
    if (!factor || factor.status !== AdminMfaFactorStatus.PENDING) {
      throw this.invalidChallengeProblem();
    }
    const match = verifyTotp(
      decryptMfaSecret(factor.secretCiphertext, this.config.mfaEncryptionKey),
      code,
    );
    if (!match) {
      await this.recordInvalidMfaCode(challenge.id, challenge.userId, context);
      throw this.invalidMfaCodeProblem();
    }

    const now = new Date();
    await this.database.client.$transaction(async (transaction) => {
      await this.consumeChallenge(transaction, challenge.id, now);
      const activated = await transaction.adminMfaFactor.updateMany({
        where: { userId: challenge.userId, status: AdminMfaFactorStatus.PENDING },
        data: {
          status: AdminMfaFactorStatus.ACTIVE,
          verifiedAt: now,
          lastUsedTimeStep: match.timeStep,
        },
      });
      if (activated.count !== 1) throw this.invalidChallengeProblem();
      await transaction.adminProfile.update({
        where: { userId: challenge.userId },
        data: { mfaEnrolledAt: now },
      });
      await this.writeAudit(transaction, {
        actorUserId: challenge.userId,
        action: 'admin.mfa.enrolled',
        resourceType: 'admin_mfa_factor',
        resourceId: challenge.userId,
        outcome: 'SUCCESS',
        context,
      });
    });
    const user = await this.requireAdminUser(challenge.userId);
    return this.createAdminSession(user, AuthAssuranceLevel.MFA, now, context, 'admin.login.mfa');
  }

  async verifyTotpChallenge(
    challengeToken: string,
    code: string,
    context: AdminRequestContext,
  ): Promise<AdminSessionTokenResult> {
    const challenge = await this.requireChallenge(challengeToken, 'VERIFY_TOTP');
    await this.requireAdminUser(challenge.userId);
    const factor = await this.database.client.adminMfaFactor.findUnique({
      where: { userId: challenge.userId },
    });
    if (!factor || factor.status !== AdminMfaFactorStatus.ACTIVE) {
      throw this.invalidChallengeProblem();
    }
    const match = verifyTotp(
      decryptMfaSecret(factor.secretCiphertext, this.config.mfaEncryptionKey),
      code,
    );
    if (!match || (factor.lastUsedTimeStep !== null && match.timeStep <= factor.lastUsedTimeStep)) {
      await this.recordInvalidMfaCode(challenge.id, challenge.userId, context);
      throw this.invalidMfaCodeProblem();
    }

    const now = new Date();
    await this.database.client.$transaction(async (transaction) => {
      await this.consumeChallenge(transaction, challenge.id, now);
      const updated = await transaction.adminMfaFactor.updateMany({
        where: {
          userId: challenge.userId,
          status: AdminMfaFactorStatus.ACTIVE,
          OR: [{ lastUsedTimeStep: null }, { lastUsedTimeStep: { lt: match.timeStep } }],
        },
        data: { lastUsedTimeStep: match.timeStep },
      });
      if (updated.count !== 1) throw this.invalidMfaCodeProblem();
      await this.writeAudit(transaction, {
        actorUserId: challenge.userId,
        action: 'admin.mfa.verified',
        resourceType: 'admin_mfa_factor',
        resourceId: challenge.userId,
        outcome: 'SUCCESS',
        context,
      });
    });
    const user = await this.requireAdminUser(challenge.userId);
    return this.createAdminSession(user, AuthAssuranceLevel.MFA, now, context, 'admin.login.mfa');
  }

  async validateSession(token: string): Promise<AdminAuthenticatedSession | null> {
    const now = new Date();
    const record = await this.database.client.session.findUnique({
      where: { tokenHash: this.hashToken(token) },
      select: {
        id: true,
        userId: true,
        kind: true,
        assuranceLevel: true,
        mfaVerifiedAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });
    if (
      !record ||
      record.kind !== SessionKind.ADMIN ||
      record.revokedAt ||
      record.expiresAt <= now
    ) {
      return null;
    }
    const user = await this.loadAdminUserById(record.userId, now);
    if (!this.canAuthenticate(user)) return null;

    await this.database.client.session.update({
      where: { id: record.id },
      data: { lastSeenAt: now },
    });
    const session = this.toAdminSession(record.id, record.expiresAt, record.assuranceLevel, user);
    return { token, session, permissionSet: new Set(session.user.permissions) };
  }

  async logout(token: string | undefined, context: AdminRequestContext): Promise<void> {
    if (!token) return;
    const record = await this.database.client.session.findFirst({
      where: { tokenHash: this.hashToken(token), kind: SessionKind.ADMIN, revokedAt: null },
      select: { id: true, userId: true },
    });
    if (!record) return;
    const now = new Date();
    await this.database.client.$transaction(async (transaction) => {
      await transaction.session.update({
        where: { id: record.id },
        data: { revokedAt: now, revocationReason: 'admin_logout' },
      });
      await this.writeAudit(transaction, {
        actorUserId: record.userId,
        action: 'admin.logout',
        resourceType: 'session',
        resourceId: record.id,
        outcome: 'SUCCESS',
        context,
      });
    });
  }

  async revokeSession(
    actor: AdminAuthenticatedSession,
    sessionId: string,
    context: AdminRequestContext,
  ): Promise<void> {
    const target = await this.database.client.session.findFirst({
      where: { id: sessionId, kind: SessionKind.ADMIN, revokedAt: null },
      select: { id: true, userId: true },
    });
    if (!target) throw this.notFoundProblem('The administration session was not found.');
    if (target.userId !== actor.session.user.id && !actor.permissionSet.has('system.manage')) {
      await this.recordAuthorizationDenied(actor, ['system.manage'], context);
      throw this.permissionProblem();
    }
    if (target.userId !== actor.session.user.id && actor.session.assuranceLevel !== 'MFA') {
      throw new ApiProblemException(
        'ADMIN_MFA_REQUIRED',
        HttpStatus.FORBIDDEN,
        'Multi-factor authentication is required for this action.',
      );
    }
    const now = new Date();
    await this.database.client.$transaction(async (transaction) => {
      await transaction.session.update({
        where: { id: target.id },
        data: { revokedAt: now, revocationReason: 'admin_revoked' },
      });
      await this.writeAudit(transaction, {
        actorUserId: actor.session.user.id,
        action: 'admin.session.revoke',
        resourceType: 'session',
        resourceId: target.id,
        outcome: 'SUCCESS',
        context,
        metadata: { targetUserId: target.userId },
      });
    });
  }

  async listRoles(): Promise<AdminRole[]> {
    const roles = await this.database.client.role.findMany({
      orderBy: { code: 'asc' },
      include: {
        permissions: {
          include: { permission: { select: { code: true } } },
        },
      },
    });
    return roles.map((role) => ({
      code: role.code,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map(({ permission }) => permission.code).sort(),
    }));
  }

  async assignRole(
    actor: AdminAuthenticatedSession,
    targetUserId: string,
    roleCode: string,
    input: AdminRoleAssignmentInput,
    context: AdminRequestContext,
  ): Promise<void> {
    this.assertOwnerRoleAuthority(actor, roleCode);
    const assignedAt = new Date();
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (expiresAt && expiresAt <= assignedAt) {
      throw new ApiProblemException(
        'VALIDATION_FAILED',
        HttpStatus.BAD_REQUEST,
        'The role expiry must be in the future.',
      );
    }
    const [target, role] = await Promise.all([
      this.database.client.adminProfile.findUnique({ where: { userId: targetUserId } }),
      this.database.client.role.findUnique({ where: { code: roleCode } }),
    ]);
    if (!target || !role) throw this.notFoundProblem('The administrator or role was not found.');
    await this.database.client.$transaction(async (transaction) => {
      await transaction.userRole.upsert({
        where: { userId_roleId: { userId: targetUserId, roleId: role.id } },
        update: { assignedByUserId: actor.session.user.id, assignedAt, expiresAt },
        create: {
          userId: targetUserId,
          roleId: role.id,
          assignedByUserId: actor.session.user.id,
          assignedAt,
          expiresAt,
        },
      });
      await this.writeAudit(transaction, {
        actorUserId: actor.session.user.id,
        action: 'admin.role.assign',
        resourceType: 'user_role',
        resourceId: `${targetUserId}:${role.code}`,
        outcome: 'SUCCESS',
        context,
        metadata: { targetUserId, roleCode, expiresAt: expiresAt?.toISOString() ?? null },
      });
    });
  }

  async revokeRole(
    actor: AdminAuthenticatedSession,
    targetUserId: string,
    roleCode: string,
    context: AdminRequestContext,
  ): Promise<void> {
    this.assertOwnerRoleAuthority(actor, roleCode);
    const role = await this.database.client.role.findUnique({ where: { code: roleCode } });
    if (!role) throw this.notFoundProblem('The role assignment was not found.');
    const assignment = await this.database.client.userRole.findUnique({
      where: { userId_roleId: { userId: targetUserId, roleId: role.id } },
    });
    if (!assignment) throw this.notFoundProblem('The role assignment was not found.');
    const assignmentIsActive = !assignment.expiresAt || assignment.expiresAt > new Date();
    if (roleCode === 'OWNER' && assignmentIsActive && (await this.countActiveOwners()) <= 1) {
      throw new ApiProblemException(
        'CONFLICT',
        HttpStatus.CONFLICT,
        'The final active Owner role cannot be removed.',
      );
    }

    await this.database.client.$transaction(async (transaction) => {
      await transaction.userRole.delete({
        where: { userId_roleId: { userId: targetUserId, roleId: role.id } },
      });
      await this.writeAudit(transaction, {
        actorUserId: actor.session.user.id,
        action: 'admin.role.revoke',
        resourceType: 'user_role',
        resourceId: `${targetUserId}:${role.code}`,
        outcome: 'SUCCESS',
        context,
        metadata: { targetUserId, roleCode },
      });
    });
  }

  async recordAuthorizationDenied(
    actor: AdminAuthenticatedSession,
    missingPermissions: string[],
    context: AdminRequestContext,
  ): Promise<void> {
    await this.database.client.auditLog.create({
      data: {
        actorType: 'USER',
        actorUserId: actor.session.user.id,
        action: 'admin.authorization.denied',
        resourceType: 'permission',
        outcome: 'DENIED',
        correlationId: context.correlationId,
        ipAddressHash: this.hashIp(context.ipAddress),
        metadata: { missingPermissions },
      },
    });
  }

  private async createChallenge(
    userId: string,
    purpose: 'ENROLL_TOTP' | 'VERIFY_TOTP',
    context: AdminRequestContext,
  ): Promise<AdminChallengeResult> {
    const token = createOpaqueToken();
    const expiresAt = this.addSeconds(new Date(), this.config.challengeTtlSeconds);
    await this.database.client.$transaction(async (transaction) => {
      await transaction.adminAuthChallenge.deleteMany({ where: { userId } });
      await transaction.adminAuthChallenge.create({
        data: { userId, purpose, tokenHash: this.hashToken(token), expiresAt },
      });
      await this.writeAudit(transaction, {
        actorUserId: userId,
        action: 'admin.mfa.challenge_created',
        resourceType: 'admin_auth_challenge',
        resourceId: userId,
        outcome: 'SUCCESS',
        context,
        metadata: { purpose },
      });
    });
    const challenge: AdminAuthChallenge = {
      status: purpose === 'ENROLL_TOTP' ? 'MFA_ENROLLMENT_REQUIRED' : 'MFA_REQUIRED',
      challengeToken: token,
      expiresAt: expiresAt.toISOString(),
    };
    return { kind: 'CHALLENGE', challenge };
  }

  private async createAdminSession(
    user: AdminUserRecord,
    assuranceLevel: AuthAssuranceLevel,
    mfaVerifiedAt: Date | null,
    context: AdminRequestContext,
    auditAction: string,
  ): Promise<AdminSessionTokenResult> {
    const token = createOpaqueToken();
    const expiresAt = this.addSeconds(new Date(), this.config.sessionTtlSeconds);
    const created = await this.database.client.$transaction(async (transaction) => {
      const session = await transaction.session.create({
        data: {
          userId: user.id,
          tokenHash: this.hashToken(token),
          kind: SessionKind.ADMIN,
          assuranceLevel,
          mfaVerifiedAt,
          expiresAt,
          ipAddressHash: this.hashIp(context.ipAddress),
          userAgent: context.userAgent?.slice(0, 500) || null,
        },
      });
      await transaction.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await this.writeAudit(transaction, {
        actorUserId: user.id,
        action: auditAction,
        resourceType: 'session',
        resourceId: session.id,
        outcome: 'SUCCESS',
        context,
      });
      return session;
    });
    return {
      kind: 'SESSION',
      token,
      session: this.toAdminSession(created.id, created.expiresAt, assuranceLevel, user),
    };
  }

  private async requireChallenge(token: string, purpose: 'ENROLL_TOTP' | 'VERIFY_TOTP') {
    const now = new Date();
    const challenge = await this.database.client.adminAuthChallenge.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });
    if (
      !challenge ||
      challenge.purpose !== purpose ||
      challenge.consumedAt ||
      challenge.expiresAt <= now ||
      challenge.attemptsRemaining <= 0
    ) {
      throw this.invalidChallengeProblem();
    }
    return challenge;
  }

  private async consumeChallenge(
    transaction: Prisma.TransactionClient,
    challengeId: string,
    now: Date,
  ): Promise<void> {
    const consumed = await transaction.adminAuthChallenge.updateMany({
      where: {
        id: challengeId,
        consumedAt: null,
        expiresAt: { gt: now },
        attemptsRemaining: { gt: 0 },
      },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) throw this.invalidChallengeProblem();
  }

  private async recordInvalidMfaCode(
    challengeId: string,
    userId: string,
    context: AdminRequestContext,
  ): Promise<void> {
    await this.database.client.$transaction(async (transaction) => {
      const challenge = await transaction.adminAuthChallenge.findUnique({
        where: { id: challengeId },
        select: { attemptsRemaining: true, expiresAt: true, consumedAt: true },
      });
      const now = new Date();
      if (challenge && !challenge.consumedAt && challenge.expiresAt > now) {
        const remaining = Math.max(0, challenge.attemptsRemaining - 1);
        await transaction.adminAuthChallenge.update({
          where: { id: challengeId },
          data: { attemptsRemaining: remaining, consumedAt: remaining === 0 ? now : null },
        });
      }
      await this.writeAudit(transaction, {
        actorUserId: userId,
        action: 'admin.mfa.invalid_code',
        resourceType: 'admin_auth_challenge',
        resourceId: challengeId,
        outcome: 'FAILURE',
        context,
      });
    });
  }

  private async requireAdminUser(userId: string): Promise<AdminUserRecord> {
    const user = await this.loadAdminUserById(userId);
    if (!this.canAuthenticate(user)) throw this.invalidCredentialsProblem();
    return user;
  }

  private loadAdminUserByEmail(normalizedEmail: string): Promise<AdminUserRecord | null> {
    return this.database.client.user.findUnique({
      where: { normalizedEmail },
      include: this.adminUserInclude(new Date()),
    });
  }

  private loadAdminUserById(userId: string, now = new Date()): Promise<AdminUserRecord | null> {
    return this.database.client.user.findUnique({
      where: { id: userId },
      include: this.adminUserInclude(now),
    });
  }

  private adminUserInclude(now: Date) {
    return {
      adminProfile: true,
      roleAssignments: {
        where: { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        include: {
          role: {
            include: {
              permissions: { include: { permission: { select: { code: true } } } },
            },
          },
        },
      },
    } satisfies Prisma.UserInclude;
  }

  private canAuthenticate(user: AdminUserRecord | null): user is AdminUserRecord & {
    adminProfile: NonNullable<AdminUserRecord['adminProfile']>;
  } {
    return Boolean(
      user &&
      user.passwordHash &&
      user.status === UserStatus.ACTIVE &&
      user.emailVerifiedAt &&
      user.adminProfile?.status === AdminProfileStatus.ACTIVE &&
      user.roleAssignments.length > 0,
    );
  }

  private toAdminSession(
    id: string,
    expiresAt: Date,
    assuranceLevel: AuthAssuranceLevel,
    user: AdminUserRecord,
  ): AdminSession {
    return {
      id,
      expiresAt: expiresAt.toISOString(),
      assuranceLevel,
      user: this.toAdminUser(user),
    };
  }

  private toAdminUser(user: AdminUserRecord): AdminUser {
    const roles = user.roleAssignments.map(({ role }) => role.code).sort();
    const permissions = [
      ...new Set(
        user.roleAssignments.flatMap(({ role }) =>
          role.permissions.map(({ permission }) => permission.code),
        ),
      ),
    ].sort();
    return {
      id: user.id,
      email: user.email,
      name: user.adminProfile!.displayName,
      roles,
      permissions,
      mfaRequired: user.adminProfile!.mfaRequired,
      mfaEnrolled: user.adminProfile!.mfaEnrolledAt !== null,
    };
  }

  private async countActiveOwners(): Promise<number> {
    const now = new Date();
    return this.database.client.userRole.count({
      where: {
        role: { code: 'OWNER' },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        user: {
          status: UserStatus.ACTIVE,
          adminProfile: { status: AdminProfileStatus.ACTIVE },
        },
      },
    });
  }

  private assertOwnerRoleAuthority(actor: AdminAuthenticatedSession, roleCode: string): void {
    if (roleCode === 'OWNER' && !actor.session.user.roles.includes('OWNER')) {
      throw this.permissionProblem();
    }
  }

  private async recordLoginFailure(
    actorUserId: string | undefined,
    context: AdminRequestContext,
  ): Promise<void> {
    await this.database.client.auditLog.create({
      data: {
        actorType: actorUserId ? 'USER' : 'SYSTEM',
        actorUserId,
        action: 'admin.login',
        resourceType: 'session',
        outcome: 'FAILURE',
        correlationId: context.correlationId,
        ipAddressHash: this.hashIp(context.ipAddress),
        metadata: { reason: 'invalid_credentials_or_account_state' },
      },
    });
  }

  private async writeAudit(
    transaction: Prisma.TransactionClient,
    input: {
      actorUserId: string;
      action: string;
      resourceType: string;
      resourceId: string;
      outcome: 'SUCCESS' | 'FAILURE' | 'DENIED';
      context: AdminRequestContext;
      metadata?: Prisma.InputJsonValue;
    },
  ): Promise<void> {
    await transaction.auditLog.create({
      data: {
        actorType: 'USER',
        actorUserId: input.actorUserId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        outcome: input.outcome,
        correlationId: input.context.correlationId,
        ipAddressHash: this.hashIp(input.context.ipAddress),
        metadata: input.metadata,
      },
    });
  }

  private hashToken(token: string): string {
    return hashOpaqueValue(token, this.config.tokenPepper);
  }

  private hashIp(ipAddress: string | undefined): string | null {
    return ipAddress ? hashOpaqueValue(ipAddress, this.config.tokenPepper) : null;
  }

  private addSeconds(date: Date, seconds: number): Date {
    return new Date(date.getTime() + seconds * 1_000);
  }

  private invalidCredentialsProblem(): ApiProblemException {
    return new ApiProblemException(
      'AUTHENTICATION_INVALID',
      HttpStatus.UNAUTHORIZED,
      'The email address or password is incorrect.',
    );
  }

  private invalidChallengeProblem(): ApiProblemException {
    return new ApiProblemException(
      'MFA_CHALLENGE_INVALID',
      HttpStatus.BAD_REQUEST,
      'The multi-factor challenge is invalid or expired.',
    );
  }

  private invalidMfaCodeProblem(): ApiProblemException {
    return new ApiProblemException(
      'MFA_CODE_INVALID',
      HttpStatus.UNAUTHORIZED,
      'The multi-factor authentication code is invalid.',
    );
  }

  private permissionProblem(): ApiProblemException {
    return new ApiProblemException(
      'PERMISSION_DENIED',
      HttpStatus.FORBIDDEN,
      'You do not have permission to perform this action.',
    );
  }

  private notFoundProblem(message: string): ApiProblemException {
    return new ApiProblemException('RESOURCE_NOT_FOUND', HttpStatus.NOT_FOUND, message);
  }
}
