import { execFile as execFileCallback } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { hashOpaqueValue } from '../auth/auth-crypto.js';
import { DatabaseService } from '../database/database.service.js';
import { ApiExceptionFilter } from '../platform/api-exception.filter.js';
import { resolveCorrelationId } from '../platform/correlation-id.js';
import { AdminAuthModule } from './admin-auth.module.js';
import { decodeBase32, generateTotp } from './admin-mfa.js';
import { provisionAdmin } from './provision-admin.js';
import { resetAdminMfa } from './reset-admin-mfa.js';

const execFile = promisify(execFileCallback);
const dockerExecutable = process.platform === 'win32' ? 'docker.exe' : 'docker';
const packageDirectory = fileURLToPath(new URL('../../../../packages/database', import.meta.url));
const prismaCli = fileURLToPath(
  new URL('../../../../packages/database/node_modules/prisma/build/index.js', import.meta.url),
);
const containerName = `tai-manic-admin-auth-test-${process.pid}-${randomUUID().slice(0, 8)}`;
const databaseName = 'tai_manic_admin_auth_test';
const databaseUser = 'tai_admin_auth_test';
const databasePassword = 'admin_auth_test_only';
const tokenPepper = 'admin-authentication-e2e-test-pepper';
const correlationId = '00000000-0000-4000-8000-000000000003';
const password = 'correct admin horse battery staple';

let app: INestApplication;
let database: DatabaseService;
let databaseUrl = '';
let containerStarted = false;
let ownerId = '';
let analystId = '';
let secondOwnerId = '';
let ownerCookie = '';

const HttpStatus = {
  OK: 200,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
} as const;

async function runDocker(arguments_: string[], timeout = 30_000): Promise<string> {
  const { stdout } = await execFile(dockerExecutable, arguments_, { encoding: 'utf8', timeout });
  return stdout.trim();
}

async function waitForDocker(): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await runDocker(['info'], 15_000);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Docker is unavailable.');
}

async function waitForPostgres(): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      await runDocker(
        ['exec', containerName, 'pg_isready', '--username', databaseUser, '--dbname', databaseName],
        5_000,
      );
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw new Error('PostgreSQL did not become ready within 60 seconds.');
}

async function runPrisma(arguments_: string[]): Promise<void> {
  await execFile(process.execPath, [prismaCli, ...arguments_], {
    cwd: packageDirectory,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    timeout: 120_000,
  });
}

function api() {
  return request(app.getHttpServer());
}

function sessionCookie(response: request.Response): string {
  const setCookie = response.headers['set-cookie'];
  const header = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!header) throw new Error('The response did not set an administration session cookie.');
  return header.split(';', 1)[0]!;
}

async function createAdmin(
  email: string,
  name: string,
  roleCode: string,
  mfaRequired: boolean,
): Promise<string> {
  const result = await provisionAdmin(database.client, {
    email,
    password,
    displayName: name,
    roleCode,
    mfaRequired,
  });
  return result.id;
}

async function login(email: string): Promise<request.Response> {
  return api().post('/api/v1/admin/auth/login').send({ email, password }).expect(HttpStatus.OK);
}

describe.sequential('administrator authentication and authorization HTTP integration', () => {
  beforeAll(async () => {
    await waitForDocker();
    await runDocker(
      [
        'run',
        '--detach',
        '--rm',
        '--name',
        containerName,
        '--env',
        `POSTGRES_DB=${databaseName}`,
        '--env',
        `POSTGRES_USER=${databaseUser}`,
        '--env',
        `POSTGRES_PASSWORD=${databasePassword}`,
        '--publish',
        '127.0.0.1::5432',
        '--tmpfs',
        '/var/lib/postgresql/data',
        'postgres:17-alpine',
      ],
      120_000,
    );
    containerStarted = true;
    await waitForPostgres();
    const portOutput = await runDocker(['port', containerName, '5432/tcp']);
    const port = portOutput.match(/:(\d+)\s*$/m)?.[1];
    if (!port) throw new Error(`Unable to determine the PostgreSQL test port from: ${portOutput}`);
    databaseUrl = `postgresql://${databaseUser}:${databasePassword}@127.0.0.1:${port}/${databaseName}?schema=public`;
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = databaseUrl;
    process.env.AUTH_TOKEN_PEPPER = tokenPepper;
    process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS = '50';
    process.env.ADMIN_MFA_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64url');
    await runPrisma(['migrate', 'deploy']);
    await runPrisma(['db', 'seed']);

    const module = await Test.createTestingModule({ imports: [AdminAuthModule] }).compile();
    app = module.createNestApplication();
    app.use((incoming: Request, outgoing: Response, next: NextFunction) => {
      incoming.correlationId = resolveCorrelationId(incoming.header('x-correlation-id'));
      outgoing.setHeader('x-correlation-id', incoming.correlationId);
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }),
    );
    app.useGlobalFilters(new ApiExceptionFilter());
    app.setGlobalPrefix('api/v1');
    await app.init();
    database = app.get(DatabaseService);

    ownerId = await createAdmin('owner@example.com', 'Owner One', 'OWNER', true);
    analystId = await createAdmin('analyst@example.com', 'Analyst One', 'ANALYST', false);
    await createAdmin(
      'store-admin@example.com',
      'Store Administrator',
      'STORE_ADMINISTRATOR',
      false,
    );
    secondOwnerId = await createAdmin('owner-two@example.com', 'Owner Two', 'ANALYST', false);
  }, 180_000);

  afterAll(async () => {
    if (app) await app.close();
    if (containerStarted) await runDocker(['rm', '--force', containerName], 30_000);
  }, 45_000);

  it('uses safe credential failures and never accepts a customer-audience session', async () => {
    const missing = await api()
      .post('/api/v1/admin/auth/login')
      .send({ email: 'missing@example.com', password })
      .expect(HttpStatus.UNAUTHORIZED);
    const wrong = await api()
      .post('/api/v1/admin/auth/login')
      .send({ email: 'analyst@example.com', password: 'incorrect password' })
      .expect(HttpStatus.UNAUTHORIZED);
    expect(missing.body.error).toMatchObject({
      code: 'AUTHENTICATION_INVALID',
      message: 'The email address or password is incorrect.',
    });
    expect(wrong.body.error).toMatchObject({
      code: 'AUTHENTICATION_INVALID',
      message: 'The email address or password is incorrect.',
    });

    const customerToken = 'customer-session-token';
    await database.client.session.create({
      data: {
        userId: analystId,
        tokenHash: hashOpaqueValue(customerToken, tokenPepper),
        kind: 'CUSTOMER',
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await api()
      .get('/api/v1/admin/auth/session')
      .set('Cookie', `tms_admin_session=${customerToken}`)
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('creates a password-only admin session with live roles and permissions', async () => {
    const response = await login('analyst@example.com');
    const cookieHeaders = response.headers['set-cookie'] as unknown as string[];
    expect(cookieHeaders[0]).toContain('HttpOnly');
    expect(cookieHeaders[0]).toContain('SameSite=Lax');
    expect(cookieHeaders[0]).toContain('Path=/api/v1');
    expect(cookieHeaders[0]).not.toContain('Secure');
    expect(response.body.data.session).toMatchObject({
      assuranceLevel: 'PASSWORD',
      user: {
        email: 'analyst@example.com',
        name: 'Analyst One',
        roles: ['ANALYST'],
        permissions: ['analytics.read', 'catalogue.read', 'inventory.read'],
      },
    });
    const stored = await database.client.session.findUniqueOrThrow({
      where: { id: response.body.data.session.id as string },
    });
    expect(stored.kind).toBe('ADMIN');
    expect(stored.tokenHash).not.toContain(sessionCookie(response).split('=', 2)[1]!);
  });

  it('enrolls TOTP, issues an MFA-assured session, and stores only an encrypted secret', async () => {
    const loginResponse = await login('owner@example.com');
    expect(loginResponse.headers['set-cookie']).toBeUndefined();
    expect(loginResponse.body.data.challenge.status).toBe('MFA_ENROLLMENT_REQUIRED');
    const challengeToken = loginResponse.body.data.challenge.challengeToken as string;
    const storedChallenge = await database.client.adminAuthChallenge.findUniqueOrThrow({
      where: { tokenHash: hashOpaqueValue(challengeToken, tokenPepper) },
    });
    expect(storedChallenge.tokenHash).not.toBe(challengeToken);

    const enrollment = await api()
      .post('/api/v1/admin/auth/mfa/enroll')
      .send({ challengeToken })
      .expect(HttpStatus.OK);
    const secret = enrollment.body.data.enrollment.secret as string;
    expect(enrollment.body.data.enrollment.otpauthUri).toContain('otpauth://totp/');
    const factor = await database.client.adminMfaFactor.findUniqueOrThrow({
      where: { userId: ownerId },
    });
    expect(factor.secretCiphertext).not.toContain(secret);

    const code = generateTotp(decodeBase32(secret), Date.now());
    const confirmed = await api()
      .post('/api/v1/admin/auth/mfa/enroll/confirm')
      .set('x-correlation-id', correlationId)
      .send({ challengeToken, code })
      .expect(HttpStatus.OK);
    ownerCookie = sessionCookie(confirmed);
    expect(confirmed.body.data.session).toMatchObject({
      assuranceLevel: 'MFA',
      user: { id: ownerId, roles: ['OWNER'], mfaEnrolled: true },
    });
    await api()
      .post('/api/v1/admin/auth/mfa/enroll/confirm')
      .send({ challengeToken, code })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('requires a fresh one-time TOTP challenge on later owner login', async () => {
    const response = await login('owner@example.com');
    expect(response.body.data.challenge.status).toBe('MFA_REQUIRED');
    const challengeToken = response.body.data.challenge.challengeToken as string;
    const factor = await database.client.adminMfaFactor.findUniqueOrThrow({
      where: { userId: ownerId },
    });
    const { decryptMfaSecret } = await import('./admin-mfa.js');
    const secret = decryptMfaSecret(factor.secretCiphertext, Buffer.alloc(32, 9));
    const nextWindowCode = generateTotp(decodeBase32(secret), Date.now() + 30_000);
    const verified = await api()
      .post('/api/v1/admin/auth/mfa/verify')
      .send({ challengeToken, code: nextWindowCode })
      .expect(HttpStatus.OK);
    ownerCookie = sessionCookie(verified);
    await api()
      .post('/api/v1/admin/auth/mfa/verify')
      .send({ challengeToken, code: nextWindowCode })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('enforces permission, MFA, and object-level session boundaries', async () => {
    const analyst = await login('analyst@example.com');
    const analystCookie = sessionCookie(analyst);
    const storeAdmin = await login('store-admin@example.com');
    const storeAdminCookie = sessionCookie(storeAdmin);

    const deniedList = await api()
      .get('/api/v1/admin/access/roles')
      .set('Cookie', analystCookie)
      .expect(HttpStatus.FORBIDDEN);
    expect(deniedList.body.error.code).toBe('PERMISSION_DENIED');
    await api()
      .get('/api/v1/admin/access/roles')
      .set('Cookie', storeAdminCookie)
      .expect(HttpStatus.OK);

    await api()
      .put(`/api/v1/admin/access/users/${analystId}/roles/CONTENT_MANAGER`)
      .set('Cookie', storeAdminCookie)
      .send({})
      .expect(HttpStatus.FORBIDDEN);
    await api()
      .put(`/api/v1/admin/access/users/${analystId}/roles/CONTENT_MANAGER`)
      .set('Cookie', ownerCookie)
      .send({})
      .expect(HttpStatus.NO_CONTENT);

    const refreshedAnalyst = await api()
      .get('/api/v1/admin/auth/session')
      .set('Cookie', analystCookie)
      .expect(HttpStatus.OK);
    expect(refreshedAnalyst.body.data.session.user.roles).toEqual(['ANALYST', 'CONTENT_MANAGER']);

    await api()
      .delete(`/api/v1/admin/access/users/${analystId}/roles/CONTENT_MANAGER`)
      .set('Cookie', storeAdminCookie)
      .expect(HttpStatus.FORBIDDEN);

    const crossSession = await api()
      .delete(`/api/v1/admin/auth/sessions/${storeAdmin.body.data.session.id as string}`)
      .set('Cookie', analystCookie)
      .expect(HttpStatus.FORBIDDEN);
    expect(crossSession.body.error.code).toBe('PERMISSION_DENIED');
    await api()
      .delete(`/api/v1/admin/auth/sessions/${storeAdmin.body.data.session.id as string}`)
      .set('Cookie', ownerCookie)
      .expect(HttpStatus.NO_CONTENT);
    await api()
      .delete(`/api/v1/admin/auth/sessions/${analyst.body.data.session.id as string}`)
      .set('Cookie', analystCookie)
      .expect(HttpStatus.NO_CONTENT);
  });

  it('restricts Owner assignments and preserves a final active Owner', async () => {
    await api()
      .put(`/api/v1/admin/access/users/${secondOwnerId}/roles/OWNER`)
      .set('Cookie', ownerCookie)
      .send({})
      .expect(HttpStatus.NO_CONTENT);
    const passwordOnlyOwner = await login('owner-two@example.com');
    const mfaDenied = await api()
      .put(`/api/v1/admin/access/users/${analystId}/roles/PRODUCTION_OPERATOR`)
      .set('Cookie', sessionCookie(passwordOnlyOwner))
      .send({})
      .expect(HttpStatus.FORBIDDEN);
    expect(mfaDenied.body.error.code).toBe('ADMIN_MFA_REQUIRED');
    await api()
      .delete(`/api/v1/admin/access/users/${secondOwnerId}/roles/OWNER`)
      .set('Cookie', ownerCookie)
      .expect(HttpStatus.NO_CONTENT);
    const finalOwner = await api()
      .delete(`/api/v1/admin/access/users/${ownerId}/roles/OWNER`)
      .set('Cookie', ownerCookie)
      .expect(HttpStatus.CONFLICT);
    expect(finalOwner.body.error.code).toBe('CONFLICT');

    const logoutSession = await login('owner-two@example.com');
    const logoutCookie = sessionCookie(logoutSession);
    await api()
      .post('/api/v1/admin/auth/logout')
      .set('Cookie', logoutCookie)
      .expect(HttpStatus.NO_CONTENT);
    await api()
      .get('/api/v1/admin/auth/session')
      .set('Cookie', logoutCookie)
      .expect(HttpStatus.UNAUTHORIZED);

    const deniedAudits = await database.client.auditLog.count({
      where: { action: 'admin.authorization.denied', outcome: 'DENIED' },
    });
    expect(deniedAudits).toBeGreaterThanOrEqual(2);
  });

  it('supports an audited operator MFA reset that revokes sessions and forces enrollment', async () => {
    expect(await resetAdminMfa(database.client, 'owner@example.com')).toBe('owner@example.com');
    const factor = await database.client.adminMfaFactor.findUniqueOrThrow({
      where: { userId: ownerId },
    });
    expect(factor.status).toBe('REVOKED');
    await api()
      .get('/api/v1/admin/auth/session')
      .set('Cookie', ownerCookie)
      .expect(HttpStatus.UNAUTHORIZED);
    const nextLogin = await login('owner@example.com');
    expect(nextLogin.body.data.challenge.status).toBe('MFA_ENROLLMENT_REQUIRED');
    expect(
      await database.client.auditLog.count({
        where: { action: 'admin.mfa.reset', resourceId: ownerId },
      }),
    ).toBe(1);
  });
});
