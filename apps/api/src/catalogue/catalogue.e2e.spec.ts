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
import { ArtworkModule } from '../artworks/artwork.module.js';
import { DatabaseService } from '../database/database.service.js';
import { ApiExceptionFilter } from '../platform/api-exception.filter.js';
import { resolveCorrelationId } from '../platform/correlation-id.js';
import { CatalogueModule } from './catalogue.module.js';

const execFile = promisify(execFileCallback);
const dockerExecutable = process.platform === 'win32' ? 'docker.exe' : 'docker';
const packageDirectory = fileURLToPath(new URL('../../../../packages/database', import.meta.url));
const prismaCli = fileURLToPath(
  new URL('../../../../packages/database/node_modules/prisma/build/index.js', import.meta.url),
);
const containerName = `tai-manic-catalogue-test-${process.pid}-${randomUUID().slice(0, 8)}`;
const credentials = {
  database: 'tai_catalogue_test',
  user: 'tai_catalogue_test',
  password: 'catalogue_test_only',
};
const password = 'correct catalogue horse battery staple';
let app: INestApplication;
let database: DatabaseService;
let databaseUrl = '';
let containerStarted = false;
let contentCookie = '';
let analystCookie = '';
let artworkId = '';
let collectionId = '';
let dropId = '';
let storyId = '';

async function runDocker(args: string[], timeout = 30_000) {
  const { stdout } = await execFile(dockerExecutable, args, { encoding: 'utf8', timeout });
  return stdout.trim();
}
async function waitForDocker() {
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
async function waitForPostgres() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      await runDocker(
        [
          'exec',
          containerName,
          'pg_isready',
          '--username',
          credentials.user,
          '--dbname',
          credentials.database,
        ],
        5_000,
      );
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw new Error('PostgreSQL did not become ready.');
}
async function runPrisma(args: string[]) {
  await execFile(process.execPath, [prismaCli, ...args], {
    cwd: packageDirectory,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    timeout: 120_000,
  });
}
function api() {
  return request(app.getHttpServer());
}
function cookie(response: request.Response) {
  const value = response.headers['set-cookie'];
  const header = Array.isArray(value) ? value[0] : value;
  if (!header) throw new Error('Missing admin cookie.');
  return header.split(';', 1)[0]!;
}
async function login(email: string) {
  return cookie(await api().post('/api/v1/admin/auth/login').send({ email, password }).expect(200));
}

describe.sequential('catalogue content and search HTTP integration', () => {
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
        `POSTGRES_DB=${credentials.database}`,
        '--env',
        `POSTGRES_USER=${credentials.user}`,
        '--env',
        `POSTGRES_PASSWORD=${credentials.password}`,
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
    if (!port) throw new Error('Missing PostgreSQL port.');
    databaseUrl = `postgresql://${credentials.user}:${credentials.password}@127.0.0.1:${port}/${credentials.database}?schema=public`;
    Object.assign(process.env, {
      NODE_ENV: 'test',
      DATABASE_URL: databaseUrl,
      AUTH_TOKEN_PEPPER: 'catalogue-e2e-token-pepper-at-least-32',
      AUTH_RATE_LIMIT_MAX_ATTEMPTS: '50',
      ADMIN_MFA_ENCRYPTION_KEY: Buffer.alloc(32, 6).toString('base64url'),
    });
    await runPrisma(['migrate', 'deploy']);
    await runPrisma(['db', 'seed']);
    const module = await Test.createTestingModule({
      imports: [ArtworkModule, CatalogueModule],
    }).compile();
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
      email: 'catalogue-content@example.com',
      password,
      displayName: 'Catalogue Content',
      roleCode: 'CONTENT_MANAGER',
      mfaRequired: false,
    });
    await provisionAdmin(database.client, {
      email: 'catalogue-analyst@example.com',
      password,
      displayName: 'Catalogue Analyst',
      roleCode: 'ANALYST',
      mfaRequired: false,
    });
    contentCookie = await login('catalogue-content@example.com');
    analystCookie = await login('catalogue-analyst@example.com');
    const artwork = await api()
      .post('/api/v1/admin/artworks')
      .set('Cookie', contentCookie)
      .send({
        slug: 'electric-lagos',
        title: 'Electric Lagos',
        shortStory: 'A violet city at night.',
      })
      .expect(201);
    artworkId = artwork.body.data.id;
    await api()
      .post(
        `/api/v1/admin/artworks/${artworkId}/versions/${artwork.body.data.versions[0].id}/publish`,
      )
      .set('Cookie', contentCookie)
      .expect(200);
  }, 180_000);

  afterAll(async () => {
    if (app) await app.close();
    if (containerStarted) await runDocker(['rm', '--force', containerName], 30_000);
  }, 45_000);

  it('enforces authentication and separates catalogue read from write permission', async () => {
    await api().get('/api/v1/admin/catalogue/tags').expect(401);
    await api().get('/api/v1/admin/catalogue/tags').set('Cookie', analystCookie).expect(200);
    const denied = await api()
      .post('/api/v1/admin/catalogue/tags')
      .set('Cookie', analystCookie)
      .send({ slug: 'denied', name: 'Denied', kind: 'GENERAL' })
      .expect(403);
    expect(denied.body.error.code).toBe('PERMISSION_DENIED');
  });

  it('creates, updates, associates, filters, and deletes canonical tags', async () => {
    const theme = await api()
      .post('/api/v1/admin/catalogue/tags')
      .set('Cookie', contentCookie)
      .send({ slug: 'night-city', name: 'Night City', kind: 'THEME' })
      .expect(201);
    const mood = await api()
      .post('/api/v1/admin/catalogue/tags')
      .set('Cookie', contentCookie)
      .send({ slug: 'electric', name: 'Electric', kind: 'MOOD' })
      .expect(201);
    await api()
      .put(`/api/v1/admin/catalogue/tags/${theme.body.data.id}/artworks/${artworkId}`)
      .set('Cookie', contentCookie)
      .expect(200);
    await api()
      .put(`/api/v1/admin/catalogue/tags/${mood.body.data.id}/artworks/${artworkId}`)
      .set('Cookie', contentCookie)
      .expect(200);
    const search = await api().get('/api/v1/artworks?theme=night-city&mood=electric').expect(200);
    expect(search.body.data.items[0]).toMatchObject({ id: artworkId, slug: 'electric-lagos' });
    await api()
      .put(`/api/v1/admin/catalogue/tags/${mood.body.data.id}`)
      .set('Cookie', contentCookie)
      .send({ slug: 'electric', name: 'Electric Energy', kind: 'MOOD' })
      .expect(200);
    await api()
      .delete(`/api/v1/admin/catalogue/tags/${mood.body.data.id}/artworks/${artworkId}`)
      .set('Cookie', contentCookie)
      .expect(204);
    expect(
      (await api().get('/api/v1/artworks?mood=electric').expect(200)).body.data.items,
    ).toHaveLength(0);
  });

  it('manages collection membership and exposes only published cursor pages', async () => {
    const created = await api()
      .post('/api/v1/admin/catalogue/collections')
      .set('Cookie', contentCookie)
      .send({ slug: 'neon-streets', title: 'Neon Streets', description: 'City light studies.' })
      .expect(201);
    collectionId = created.body.data.id;
    await api()
      .put(`/api/v1/admin/catalogue/collections/${collectionId}/artworks/${artworkId}`)
      .set('Cookie', contentCookie)
      .send({ position: 2 })
      .expect(200);
    const draftArtwork = await api()
      .post('/api/v1/admin/artworks')
      .set('Cookie', contentCookie)
      .send({ slug: 'unreleased-study', title: 'Unreleased Study' })
      .expect(201);
    await api()
      .put(
        `/api/v1/admin/catalogue/collections/${collectionId}/artworks/${draftArtwork.body.data.id}`,
      )
      .set('Cookie', contentCookie)
      .send({ position: 3 })
      .expect(200);
    expect(
      (await api().get('/api/v1/collections?limit=1').expect(200)).body.data.items,
    ).toHaveLength(0);
    await api()
      .patch(`/api/v1/admin/catalogue/collections/${collectionId}`)
      .set('Cookie', contentCookie)
      .send({ status: 'PUBLISHED' })
      .expect(200);
    const page = await api().get('/api/v1/collections?limit=1').expect(200);
    expect(page.body.data.items[0]).toMatchObject({ slug: 'neon-streets', status: 'PUBLISHED' });
    expect(
      (await api().get('/api/v1/collections/neon-streets').expect(200)).body.data.artworks,
    ).toEqual([{ artworkId, position: 2 }]);
    expect(
      (await api().get('/api/v1/artworks?collection=neon-streets').expect(200)).body.data.items[0]
        .id,
    ).toBe(artworkId);
  });

  it('manages timed drops and limited editions as catalogue metadata', async () => {
    const drop = await api()
      .post('/api/v1/admin/catalogue/drops')
      .set('Cookie', contentCookie)
      .send({
        slug: 'midnight-release',
        title: 'Midnight Release',
        startsAt: '2026-08-01T00:00:00Z',
        endsAt: '2026-08-02T00:00:00Z',
      })
      .expect(201);
    dropId = drop.body.data.id;
    await api()
      .put(`/api/v1/admin/catalogue/drops/${dropId}/artworks/${artworkId}`)
      .set('Cookie', contentCookie)
      .send({ position: 0 })
      .expect(200);
    await api()
      .patch(`/api/v1/admin/catalogue/drops/${dropId}`)
      .set('Cookie', contentCookie)
      .send({ status: 'PUBLISHED' })
      .expect(200);
    await api()
      .post(`/api/v1/admin/catalogue/artworks/${artworkId}/editions`)
      .set('Cookie', contentCookie)
      .send({ name: 'First Edition', totalQuantity: 50, numbered: true, status: 'PUBLISHED' })
      .expect(201);
    expect(
      (await api().get('/api/v1/drops/midnight-release').expect(200)).body.data.artworks[0]
        .artworkId,
    ).toBe(artworkId);
    expect(
      (await api().get('/api/v1/artworks?drop=midnight-release&limitedEdition=true').expect(200))
        .body.data.items[0].id,
    ).toBe(artworkId);
  });

  it('creates ordered editorial story blocks and keeps drafts private', async () => {
    const created = await api()
      .post('/api/v1/admin/catalogue/stories')
      .set('Cookie', contentCookie)
      .send({
        slug: 'making-electric-lagos',
        title: 'Making Electric Lagos',
        excerpt: 'Behind the artwork.',
        artworkId,
        blocks: [
          { type: 'TEXT', content: { text: 'First block' } },
          { type: 'QUOTE', content: { quote: 'The city hums.' } },
        ],
      })
      .expect(201);
    storyId = created.body.data.id;
    await api().get('/api/v1/stories/making-electric-lagos').expect(404);
    const published = await api()
      .put(`/api/v1/admin/catalogue/stories/${storyId}`)
      .set('Cookie', contentCookie)
      .send({
        slug: 'making-electric-lagos',
        title: 'Making Electric Lagos',
        artworkId,
        status: 'PUBLISHED',
        blocks: [{ type: 'TEXT', content: { text: 'Revised first block' } }],
      })
      .expect(200);
    expect(published.body.data.blocks).toHaveLength(1);
    expect(
      (await api().get('/api/v1/stories/making-electric-lagos').expect(200)).body.data.blocks[0],
    ).toMatchObject({ position: 0, type: 'TEXT' });
  });

  it('enforces database constraints, returns safe conflicts, and audits mutations', async () => {
    const badWindow = await api()
      .post('/api/v1/admin/catalogue/drops')
      .set('Cookie', contentCookie)
      .send({
        slug: 'bad-window',
        title: 'Bad Window',
        startsAt: '2026-09-02T00:00:00Z',
        endsAt: '2026-09-01T00:00:00Z',
      })
      .expect(400);
    expect(badWindow.body.error.code).toBe('VALIDATION_FAILED');
    await api()
      .post('/api/v1/admin/catalogue/drops')
      .set('Cookie', contentCookie)
      .send({ slug: 'bad-date', title: 'Bad Date', startsAt: 'tomorrow' })
      .expect(400);
    const duplicate = await api()
      .post('/api/v1/admin/catalogue/collections')
      .set('Cookie', contentCookie)
      .send({ slug: 'neon-streets', title: 'Duplicate' })
      .expect(409);
    expect(duplicate.body.error.code).toBe('CONFLICT');
    expect(
      await database.client.auditLog.count({
        where: { action: { startsWith: 'catalogue.' }, outcome: 'SUCCESS' },
      }),
    ).toBeGreaterThanOrEqual(10);
    await api()
      .delete(`/api/v1/admin/catalogue/stories/${storyId}`)
      .set('Cookie', contentCookie)
      .expect(204);
    await api()
      .delete(`/api/v1/admin/catalogue/drops/${dropId}`)
      .set('Cookie', contentCookie)
      .expect(204);
    await api()
      .delete(`/api/v1/admin/catalogue/collections/${collectionId}`)
      .set('Cookie', contentCookie)
      .expect(204);
  });
});
