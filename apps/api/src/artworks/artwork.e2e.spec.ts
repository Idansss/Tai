import { execFile as execFileCallback } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { provisionAdmin } from '../admin-auth/provision-admin.js';
import { DatabaseService } from '../database/database.service.js';
import { ApiExceptionFilter } from '../platform/api-exception.filter.js';
import { resolveCorrelationId } from '../platform/correlation-id.js';
import { ArtworkModule } from './artwork.module.js';

const execFile = promisify(execFileCallback);
const dockerExecutable = process.platform === 'win32' ? 'docker.exe' : 'docker';
const packageDirectory = fileURLToPath(new URL('../../../../packages/database', import.meta.url));
const prismaCli = fileURLToPath(
  new URL('../../../../packages/database/node_modules/prisma/build/index.js', import.meta.url),
);
const containerName = `tai-manic-artwork-test-${process.pid}-${randomUUID().slice(0, 8)}`;
const databaseName = 'tai_manic_artwork_test';
const databaseUser = 'tai_artwork_test';
const databasePassword = 'artwork_test_only';
const password = 'correct artwork horse battery staple';
const correlationId = '00000000-0000-4000-8000-000000000004';

let app: INestApplication;
let database: DatabaseService;
let databaseUrl = '';
let containerStarted = false;
let contentCookie = '';
let analystCookie = '';
let artworkId = '';
let firstVersionId = '';
let secondVersionId = '';

const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
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
  if (!header) throw new Error('The response did not set an administrator session cookie.');
  return header.split(';', 1)[0]!;
}

async function login(email: string): Promise<string> {
  const response = await api()
    .post('/api/v1/admin/auth/login')
    .send({ email, password })
    .expect(HttpStatus.OK);
  return sessionCookie(response);
}

describe.sequential('artwork and immutable artwork version HTTP integration', () => {
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
    process.env.AUTH_TOKEN_PEPPER = 'artwork-e2e-token-pepper-at-least-32';
    process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS = '50';
    process.env.ADMIN_MFA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64url');
    await runPrisma(['migrate', 'deploy']);
    await runPrisma(['db', 'seed']);

    const module = await Test.createTestingModule({ imports: [ArtworkModule] }).compile();
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

    await provisionAdmin(database.client, {
      email: 'content@example.com',
      password,
      displayName: 'Content Manager',
      roleCode: 'CONTENT_MANAGER',
      mfaRequired: false,
    });
    await provisionAdmin(database.client, {
      email: 'analyst-artwork@example.com',
      password,
      displayName: 'Artwork Analyst',
      roleCode: 'ANALYST',
      mfaRequired: false,
    });
    contentCookie = await login('content@example.com');
    analystCookie = await login('analyst-artwork@example.com');
  }, 180_000);

  afterAll(async () => {
    if (app) await app.close();
    if (containerStarted) await runDocker(['rm', '--force', containerName], 30_000);
  }, 45_000);

  it('requires administrator authentication and enforces catalogue write permission', async () => {
    await api().get('/api/v1/admin/artworks').expect(HttpStatus.UNAUTHORIZED);
    await api().get('/api/v1/admin/artworks').set('Cookie', analystCookie).expect(HttpStatus.OK);
    const denied = await api()
      .post('/api/v1/admin/artworks')
      .set('Cookie', analystCookie)
      .set('x-correlation-id', correlationId)
      .send({ slug: 'denied-artwork', title: 'Denied Artwork' })
      .expect(HttpStatus.FORBIDDEN);
    expect(denied.body.error.code).toBe('PERMISSION_DENIED');
    const audit = await database.client.auditLog.findFirst({
      where: { action: 'admin.authorization.denied', correlationId },
    });
    expect(audit).toMatchObject({ outcome: 'DENIED', resourceType: 'permission' });
  });

  it('creates a draft artwork with one immutable version and keeps drafts private', async () => {
    await api()
      .post('/api/v1/admin/artworks')
      .set('Cookie', contentCookie)
      .send({ slug: 'Not Valid', title: 'Invalid' })
      .expect(HttpStatus.BAD_REQUEST);
    const created = await api()
      .post('/api/v1/admin/artworks')
      .set('Cookie', contentCookie)
      .send({
        slug: 'lagos-after-dark',
        title: 'Lagos After Dark',
        shortStory: 'A city awake in electric colour.',
        story: 'The first immutable story.',
        inspiration: 'Night movement and hand-painted signs.',
        metadata: { mood: 'electric', palette: ['violet', 'amber'] },
      })
      .expect(HttpStatus.CREATED);
    expect(created.body.data).toMatchObject({
      slug: 'lagos-after-dark',
      status: 'DRAFT',
      publishedVersion: null,
    });
    expect(created.body.data.versions).toHaveLength(1);
    expect(created.body.data.versions[0]).toMatchObject({
      versionNumber: 1,
      status: 'DRAFT',
      title: 'Lagos After Dark',
    });
    artworkId = created.body.data.id;
    firstVersionId = created.body.data.versions[0].id;
    await api().get('/api/v1/artworks/Not%20Valid').expect(HttpStatus.BAD_REQUEST);
    await api().get('/api/v1/artworks/lagos-after-dark').expect(HttpStatus.NOT_FOUND);
    await api()
      .post('/api/v1/admin/artworks')
      .set('Cookie', contentCookie)
      .send({ slug: 'lagos-after-dark', title: 'Duplicate' })
      .expect(HttpStatus.CONFLICT);
  });

  it('creates ordered versions while database and HTTP bypass attempts cannot mutate content', async () => {
    await expect(
      database.client.artworkVersion.update({
        where: { id: firstVersionId },
        data: { title: 'Mutated outside the API' },
      }),
    ).rejects.toThrow('artwork version content is immutable');
    await api()
      .patch(`/api/v1/admin/artworks/${artworkId}/versions/${firstVersionId}`)
      .set('Cookie', contentCookie)
      .send({ title: 'Mutated through an unapproved route' })
      .expect(HttpStatus.NOT_FOUND);

    const versioned = await api()
      .post(`/api/v1/admin/artworks/${artworkId}/versions`)
      .set('Cookie', contentCookie)
      .send({
        title: 'Lagos After Dark — Second Light',
        shortStory: 'The same city at first light.',
        metadata: { mood: 'dawn' },
      })
      .expect(HttpStatus.CREATED);
    expect(
      versioned.body.data.versions.map(
        (version: { versionNumber: number }) => version.versionNumber,
      ),
    ).toEqual([2, 1]);
    secondVersionId = versioned.body.data.versions[0].id;
    const concurrent = await Promise.all([
      api()
        .post(`/api/v1/admin/artworks/${artworkId}/versions`)
        .set('Cookie', contentCookie)
        .send({ title: 'Concurrent Third Version' }),
      api()
        .post(`/api/v1/admin/artworks/${artworkId}/versions`)
        .set('Cookie', contentCookie)
        .send({ title: 'Concurrent Fourth Version' }),
    ]);
    expect(concurrent.map(({ status }) => status)).toEqual([
      HttpStatus.CREATED,
      HttpStatus.CREATED,
    ]);
    const afterConcurrent = await api()
      .get(`/api/v1/admin/artworks/${artworkId}`)
      .set('Cookie', contentCookie)
      .expect(HttpStatus.OK);
    expect(
      afterConcurrent.body.data.versions.map(
        (version: { versionNumber: number }) => version.versionNumber,
      ),
    ).toEqual([4, 3, 2, 1]);
    const original = await database.client.artworkVersion.findUniqueOrThrow({
      where: { id: firstVersionId },
    });
    expect(original).toMatchObject({ title: 'Lagos After Dark', status: 'DRAFT' });
    await expect(
      database.client.artworkVersion.delete({ where: { id: firstVersionId } }),
    ).rejects.toThrow('artwork versions are immutable and cannot be deleted');
  });

  it('publishes one exact version at a time and archives the prior publication', async () => {
    await api()
      .post(`/api/v1/admin/artworks/${artworkId}/versions/${firstVersionId}/publish`)
      .set('Cookie', contentCookie)
      .expect(HttpStatus.OK);
    const firstPublic = await api().get('/api/v1/artworks/lagos-after-dark').expect(HttpStatus.OK);
    expect(firstPublic.body.data.publishedVersion).toMatchObject({
      id: firstVersionId,
      title: 'Lagos After Dark',
      status: 'PUBLISHED',
    });
    expect(JSON.stringify(firstPublic.body)).not.toContain('Second Light');

    const republished = await api()
      .post(`/api/v1/admin/artworks/${artworkId}/versions/${secondVersionId}/publish`)
      .set('Cookie', contentCookie)
      .expect(HttpStatus.OK);
    expect(republished.body.data.publishedVersion.id).toBe(secondVersionId);
    expect(republished.body.data.versions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: firstVersionId, status: 'ARCHIVED' }),
        expect.objectContaining({ id: secondVersionId, status: 'PUBLISHED' }),
      ]),
    );
    const publishedCount = await database.client.artworkVersion.count({
      where: { artworkId, status: 'PUBLISHED' },
    });
    expect(publishedCount).toBe(1);
  });

  it('provides cursor pages and rejects cross-artwork version identifiers', async () => {
    const second = await api()
      .post('/api/v1/admin/artworks')
      .set('Cookie', contentCookie)
      .send({ slug: 'quiet-current', title: 'Quiet Current' })
      .expect(HttpStatus.CREATED);
    const otherArtworkId = second.body.data.id as string;
    const otherVersionId = second.body.data.versions[0].id as string;
    await api()
      .post(`/api/v1/admin/artworks/${otherArtworkId}/versions/${otherVersionId}/publish`)
      .set('Cookie', contentCookie)
      .expect(HttpStatus.OK);
    const firstPage = await api().get('/api/v1/artworks?limit=1').expect(HttpStatus.OK);
    expect(firstPage.body.data.items).toHaveLength(1);
    expect(firstPage.body.data.nextCursor).toMatch(/^[0-9a-f-]{36}$/);
    const secondPage = await api()
      .get(`/api/v1/artworks?limit=1&cursor=${firstPage.body.data.nextCursor}`)
      .expect(HttpStatus.OK);
    expect(secondPage.body.data.items).toHaveLength(1);
    expect(secondPage.body.data.items[0].id).not.toBe(firstPage.body.data.items[0].id);

    await api()
      .post(`/api/v1/admin/artworks/${artworkId}/versions/${otherVersionId}/publish`)
      .set('Cookie', contentCookie)
      .expect(HttpStatus.NOT_FOUND);
  });

  it('archives versions and artwork roots without deleting history and records lifecycle audits', async () => {
    await api()
      .post(`/api/v1/admin/artworks/${artworkId}/versions/${secondVersionId}/archive`)
      .set('Cookie', contentCookie)
      .expect(HttpStatus.OK);
    await api().get('/api/v1/artworks/lagos-after-dark').expect(HttpStatus.NOT_FOUND);
    await api()
      .post(`/api/v1/admin/artworks/${artworkId}/versions/${firstVersionId}/publish`)
      .set('Cookie', contentCookie)
      .expect(HttpStatus.OK);
    await api().get('/api/v1/artworks/lagos-after-dark').expect(HttpStatus.OK);
    const archived = await api()
      .post(`/api/v1/admin/artworks/${artworkId}/archive`)
      .set('Cookie', contentCookie)
      .expect(HttpStatus.OK);
    expect(archived.body.data).toMatchObject({ status: 'ARCHIVED', publishedVersion: null });
    expect(archived.body.data.versions).toHaveLength(4);
    await api().get('/api/v1/artworks/lagos-after-dark').expect(HttpStatus.NOT_FOUND);
    const auditActions = await database.client.auditLog.findMany({
      where: { resourceType: 'artwork' },
      select: { action: true },
    });
    expect(auditActions.map(({ action }) => action)).toEqual(
      expect.arrayContaining([
        'artwork.create',
        'artwork.version.create',
        'artwork.version.publish',
        'artwork.version.archive',
        'artwork.archive',
      ]),
    );
  });
});
