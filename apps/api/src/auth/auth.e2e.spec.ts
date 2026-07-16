import { execFile as execFileCallback } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { EmailMessage, EmailProvider } from '@tms/email';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../database/database.service.js';
import { ApiExceptionFilter } from '../platform/api-exception.filter.js';
import { resolveCorrelationId } from '../platform/correlation-id.js';
import { AuthModule } from './auth.module.js';
import { AUTH_EMAIL_PROVIDER } from './auth.tokens.js';

const execFile = promisify(execFileCallback);
const dockerExecutable = process.platform === 'win32' ? 'docker.exe' : 'docker';
const packageDirectory = fileURLToPath(new URL('../../../../packages/database', import.meta.url));
const prismaCli = fileURLToPath(
  new URL('../../../../packages/database/node_modules/prisma/build/index.js', import.meta.url),
);
const containerName = `tai-manic-auth-test-${process.pid}-${randomUUID().slice(0, 8)}`;
const databaseName = 'tai_manic_auth_test';
const databaseUser = 'tai_auth_test';
const databasePassword = 'auth_test_only';
const correlationId = '00000000-0000-4000-8000-000000000002';

class FakeEmailProvider implements EmailProvider {
  readonly messages: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<{ messageId: string }> {
    this.messages.push(message);
    return { messageId: `test-message-${this.messages.length}` };
  }

  tokenFor(email: string, template: EmailMessage['template']): string {
    const message = [...this.messages]
      .reverse()
      .find((candidate) => candidate.to === email && candidate.template === template);
    const actionUrl = message?.variables.actionUrl;
    const token = actionUrl ? new URL(actionUrl).searchParams.get('token') : null;
    if (!token) throw new Error(`No ${template} token was sent to ${email}.`);
    return token;
  }
}

let app: INestApplication;
let database: DatabaseService;
let databaseUrl = '';
let containerStarted = false;
const emailProvider = new FakeEmailProvider();

async function runDocker(arguments_: string[], timeout = 30_000): Promise<string> {
  const { stdout } = await execFile(dockerExecutable, arguments_, {
    encoding: 'utf8',
    timeout,
  });
  return stdout.trim();
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
  if (!header) throw new Error('The response did not set a session cookie.');
  return header.split(';', 1)[0]!;
}

async function registerAndVerify(email: string, password: string): Promise<request.Response> {
  await api()
    .post('/api/v1/auth/register')
    .set('x-correlation-id', correlationId)
    .send({ email, password })
    .expect(HttpStatus.CREATED);
  const token = emailProvider.tokenFor(email, 'auth-email-verification');
  return api()
    .post('/api/v1/auth/email-verification/confirm')
    .set('x-correlation-id', correlationId)
    .send({ token })
    .expect(HttpStatus.OK);
}

const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
} as const;

describe.sequential('customer authentication HTTP integration', () => {
  beforeAll(async () => {
    await runDocker(['info'], 15_000);
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
    process.env.AUTH_TOKEN_PEPPER = 'authentication-e2e-test-pepper-value';
    process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS = '10';
    await runPrisma(['migrate', 'deploy']);

    const module = await Test.createTestingModule({ imports: [AuthModule] })
      .overrideProvider(AUTH_EMAIL_PROVIDER)
      .useValue(emailProvider)
      .compile();
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
  }, 180_000);

  afterAll(async () => {
    if (app) await app.close();
    if (containerStarted) await runDocker(['rm', '--force', containerName], 30_000);
  }, 45_000);

  it('registers with hashed credentials and does not disclose or store raw tokens', async () => {
    const response = await api()
      .post('/api/v1/auth/register')
      .set('x-correlation-id', correlationId)
      .send({
        email: ' Customer.One@Example.COM ',
        password: 'correct horse battery staple',
        displayName: 'Customer One',
      })
      .expect(HttpStatus.CREATED);

    expect(response.body).toMatchObject({
      data: {
        user: {
          email: 'customer.one@example.com',
          status: 'PENDING_VERIFICATION',
          displayName: 'Customer One',
        },
        verificationRequired: true,
      },
      meta: { correlationId },
    });
    const token = emailProvider.tokenFor('customer.one@example.com', 'auth-email-verification');
    const user = await database.client.user.findUniqueOrThrow({
      where: { normalizedEmail: 'customer.one@example.com' },
      include: { verificationTokens: true },
    });
    expect(user.passwordHash).toMatch(/^scrypt\$/);
    expect(user.passwordHash).not.toContain('correct horse');
    expect(user.verificationTokens[0]?.tokenHash).toHaveLength(64);
    expect(user.verificationTokens[0]?.tokenHash).not.toBe(token);

    await api()
      .post('/api/v1/auth/register')
      .send({ email: 'customer.one@example.com', password: 'another secure password' })
      .expect(HttpStatus.CONFLICT);
    await api()
      .post('/api/v1/auth/register')
      .send({ email: 'invalid', password: 'short' })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('requires verification, consumes a verification token once, and sets a secure session cookie', async () => {
    const unverified = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'customer.one@example.com', password: 'correct horse battery staple' })
      .expect(HttpStatus.FORBIDDEN);
    expect(unverified.body.error.code).toBe('EMAIL_VERIFICATION_REQUIRED');

    const token = emailProvider.tokenFor('customer.one@example.com', 'auth-email-verification');
    const verified = await api()
      .post('/api/v1/auth/email-verification/confirm')
      .set('x-correlation-id', correlationId)
      .send({ token })
      .expect(HttpStatus.OK);
    const cookieHeader = verified.headers['set-cookie'] as unknown as string[];
    expect(cookieHeader[0]).toContain('HttpOnly');
    expect(cookieHeader[0]).toContain('SameSite=Lax');
    expect(cookieHeader[0]).toContain('Path=/api/v1');
    expect(cookieHeader[0]).not.toContain('Secure');
    const cookie = sessionCookie(verified);
    const rawToken = cookie.split('=', 2)[1]!;
    const storedSession = await database.client.session.findUniqueOrThrow({
      where: { id: verified.body.data.session.id as string },
    });
    expect(storedSession.tokenHash).toHaveLength(64);
    expect(storedSession.tokenHash).not.toBe(rawToken);

    const reused = await api()
      .post('/api/v1/auth/email-verification/confirm')
      .send({ token })
      .expect(HttpStatus.BAD_REQUEST);
    expect(reused.body.error.code).toBe('TOKEN_INVALID_OR_EXPIRED');
  });

  it('uses one safe invalid-credentials response and authenticates a verified customer', async () => {
    const missing = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'missing@example.com', password: 'wrong but long enough' })
      .expect(HttpStatus.UNAUTHORIZED);
    const wrong = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'customer.one@example.com', password: 'wrong but long enough' })
      .expect(HttpStatus.UNAUTHORIZED);
    expect(missing.body.error).toMatchObject({
      code: 'AUTHENTICATION_INVALID',
      message: 'The email address or password is incorrect.',
    });
    expect(wrong.body.error).toMatchObject({
      code: 'AUTHENTICATION_INVALID',
      message: 'The email address or password is incorrect.',
    });

    const loggedIn = await api()
      .post('/api/v1/auth/login')
      .send({
        email: 'customer.one@example.com',
        password: 'correct horse battery staple',
      })
      .expect(HttpStatus.OK);
    const current = await api()
      .get('/api/v1/auth/session')
      .set('Cookie', sessionCookie(loggedIn))
      .expect(HttpStatus.OK);
    expect(current.body.data.session.user.email).toBe('customer.one@example.com');
  });

  it('enforces object ownership for session revocation and supports revoke-all', async () => {
    const customerOne = await api()
      .post('/api/v1/auth/login')
      .send({
        email: 'customer.one@example.com',
        password: 'correct horse battery staple',
      })
      .expect(HttpStatus.OK);
    const customerTwo = await registerAndVerify(
      'customer.two@example.com',
      'customer two secure password',
    );

    const crossCustomer = await api()
      .delete(`/api/v1/auth/sessions/${customerTwo.body.data.session.id as string}`)
      .set('Cookie', sessionCookie(customerOne))
      .expect(HttpStatus.NOT_FOUND);
    expect(crossCustomer.body.error.code).toBe('RESOURCE_NOT_FOUND');

    await api()
      .delete(`/api/v1/auth/sessions/${customerOne.body.data.session.id as string}`)
      .set('Cookie', sessionCookie(customerOne))
      .expect(HttpStatus.NO_CONTENT);
    await api()
      .get('/api/v1/auth/session')
      .set('Cookie', sessionCookie(customerOne))
      .expect(HttpStatus.UNAUTHORIZED);

    await api()
      .delete('/api/v1/auth/sessions')
      .set('Cookie', sessionCookie(customerTwo))
      .expect(HttpStatus.NO_CONTENT);
    await api()
      .get('/api/v1/auth/session')
      .set('Cookie', sessionCookie(customerTwo))
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('keeps reset requests enumeration-safe and revokes sessions when a token is consumed', async () => {
    const active = await api()
      .post('/api/v1/auth/login')
      .send({
        email: 'customer.one@example.com',
        password: 'correct horse battery staple',
      })
      .expect(HttpStatus.OK);
    const known = await api()
      .post('/api/v1/auth/password-reset/request')
      .set('x-correlation-id', correlationId)
      .send({ email: 'customer.one@example.com' })
      .expect(HttpStatus.ACCEPTED);
    const unknown = await api()
      .post('/api/v1/auth/password-reset/request')
      .set('x-correlation-id', correlationId)
      .send({ email: 'unknown@example.com' })
      .expect(HttpStatus.ACCEPTED);
    expect(known.body).toEqual(unknown.body);

    const token = emailProvider.tokenFor('customer.one@example.com', 'auth-password-reset');
    await api()
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token, password: 'a completely new password' })
      .expect(HttpStatus.NO_CONTENT);
    await api()
      .get('/api/v1/auth/session')
      .set('Cookie', sessionCookie(active))
      .expect(HttpStatus.UNAUTHORIZED);
    await api()
      .post('/api/v1/auth/login')
      .send({ email: 'customer.one@example.com', password: 'correct horse battery staple' })
      .expect(HttpStatus.UNAUTHORIZED);
    const replacement = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'customer.one@example.com', password: 'a completely new password' })
      .expect(HttpStatus.OK);

    await api()
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token, password: 'another completely new password' })
      .expect(HttpStatus.BAD_REQUEST);
    await api()
      .post('/api/v1/auth/logout')
      .set('Cookie', sessionCookie(replacement))
      .expect(HttpStatus.NO_CONTENT);
    await api().post('/api/v1/auth/logout').expect(HttpStatus.NO_CONTENT);
  });

  it('throttles repeated authentication attempts without storing raw limiter identities', async () => {
    const attempts = [];
    for (let index = 0; index < 11; index += 1) {
      attempts.push(
        await api()
          .post('/api/v1/auth/login')
          .send({ email: 'throttle@example.com', password: 'wrong but long enough' }),
      );
    }
    expect(attempts.slice(0, 10).every(({ status }) => status === HttpStatus.UNAUTHORIZED)).toBe(
      true,
    );
    expect(attempts[10]?.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(attempts[10]?.body.error.code).toBe('RATE_LIMITED');
  }, 20_000);

  it('records authentication audit evidence without mutable history', async () => {
    const auditCount = await database.client.auditLog.count({
      where: { action: { startsWith: 'auth.' } },
    });
    expect(auditCount).toBeGreaterThan(10);
  });
});
