import { execFile as execFileCallback } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { HttpStatus, ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { provisionAdmin } from '../admin-auth/provision-admin.js';
import { ArtworkModule } from '../artworks/artwork.module.js';
import { DatabaseService } from '../database/database.service.js';
import { ApiExceptionFilter } from '../platform/api-exception.filter.js';
import { resolveCorrelationId } from '../platform/correlation-id.js';
import { GarmentModule } from './garment.module.js';

const execFile = promisify(execFileCallback);
const dockerExecutable = process.platform === 'win32' ? 'docker.exe' : 'docker';
const packageDirectory = fileURLToPath(new URL('../../../../packages/database', import.meta.url));
const prismaCli = fileURLToPath(
  new URL('../../../../packages/database/node_modules/prisma/build/index.js', import.meta.url),
);
const containerName = `tai-manic-garment-test-${process.pid}-${randomUUID().slice(0, 8)}`;
const credentials = {
  database: 'tai_garment_test',
  user: 'tai_garment_test',
  password: 'garment_test_only',
};
const password = 'correct garment horse battery staple';
let app: INestApplication;
let database: DatabaseService;
let databaseUrl = '';
let containerStarted = false;
let contentCookie = '';
let analystCookie = '';
let artworkId = '';
let artworkVersionId = '';
let draftArtworkVersionId = '';
let templateId = '';
let colourId = '';
let sizeId = '';
let variantId = '';
let placementId = '';

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

describe.sequential('garment catalogue and compatibility HTTP integration', () => {
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
      AUTH_TOKEN_PEPPER: 'garment-e2e-token-pepper-at-least-32',
      AUTH_RATE_LIMIT_MAX_ATTEMPTS: '50',
      ADMIN_MFA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64url'),
    });
    await runPrisma(['migrate', 'deploy']);
    await runPrisma(['db', 'seed']);
    const module = await Test.createTestingModule({
      imports: [ArtworkModule, GarmentModule],
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
      email: 'garment-content@example.com',
      password,
      displayName: 'Garment Content',
      roleCode: 'CONTENT_MANAGER',
      mfaRequired: false,
    });
    await provisionAdmin(database.client, {
      email: 'garment-analyst@example.com',
      password,
      displayName: 'Garment Analyst',
      roleCode: 'ANALYST',
      mfaRequired: false,
    });
    contentCookie = await login('garment-content@example.com');
    analystCookie = await login('garment-analyst@example.com');

    const artwork = await api()
      .post('/api/v1/admin/artworks')
      .set('Cookie', contentCookie)
      .send({ slug: 'midnight-signal', title: 'Midnight Signal' })
      .expect(HttpStatus.CREATED);
    artworkId = artwork.body.data.id;
    artworkVersionId = artwork.body.data.versions[0].id;
    await api()
      .post(`/api/v1/admin/artworks/${artworkId}/versions/${artworkVersionId}/publish`)
      .set('Cookie', contentCookie)
      .expect(HttpStatus.OK);
    const draftArtwork = await api()
      .post('/api/v1/admin/artworks')
      .set('Cookie', contentCookie)
      .send({ slug: 'future-signal', title: 'Future Signal' })
      .expect(HttpStatus.CREATED);
    draftArtworkVersionId = draftArtwork.body.data.versions[0].id;
  }, 180_000);

  afterAll(async () => {
    if (app) await app.close();
    if (containerStarted) await runDocker(['rm', '--force', containerName], 30_000);
  }, 45_000);

  it('requires authentication and separates catalogue read from write permission', async () => {
    await api().get('/api/v1/admin/garments').expect(HttpStatus.UNAUTHORIZED);
    await api().get('/api/v1/admin/garments').set('Cookie', analystCookie).expect(HttpStatus.OK);
    const denied = await api()
      .post('/api/v1/admin/garments')
      .set('Cookie', analystCookie)
      .send({ slug: 'denied', title: 'Denied', type: 'CLASSIC_TSHIRT' })
      .expect(HttpStatus.FORBIDDEN);
    expect(denied.body.error.code).toBe('PERMISSION_DENIED');
  });

  it('builds a garment from valid template members and rejects unsafe variants', async () => {
    const template = await api()
      .post('/api/v1/admin/garments')
      .set('Cookie', contentCookie)
      .send({
        slug: 'studio-classic-tee',
        title: 'Studio Classic Tee',
        description: 'An approved blank cotton canvas.',
        type: 'CLASSIC_TSHIRT',
        fabric: '240gsm cotton',
        fit: 'Regular',
        care: 'Cold wash inside out.',
      })
      .expect(HttpStatus.CREATED);
    templateId = template.body.data.id;
    await api().get('/api/v1/garments/studio-classic-tee').expect(HttpStatus.NOT_FOUND);
    await api()
      .patch(`/api/v1/admin/garments/${templateId}`)
      .set('Cookie', contentCookie)
      .send({})
      .expect(HttpStatus.BAD_REQUEST);
    const premature = await api()
      .patch(`/api/v1/admin/garments/${templateId}`)
      .set('Cookie', contentCookie)
      .send({ status: 'PUBLISHED' })
      .expect(HttpStatus.BAD_REQUEST);
    expect(premature.body.error.code).toBe('VALIDATION_FAILED');

    await api()
      .post(`/api/v1/admin/garments/${templateId}/colours`)
      .set('Cookie', contentCookie)
      .send({ slug: 'bad-hex', name: 'Bad Hex', hex: '#111' })
      .expect(HttpStatus.BAD_REQUEST);

    const colour = await api()
      .post(`/api/v1/admin/garments/${templateId}/colours`)
      .set('Cookie', contentCookie)
      .send({ slug: 'washed-black', name: 'Washed Black', hex: '#111111', status: 'PUBLISHED' })
      .expect(HttpStatus.CREATED);
    colourId = colour.body.data.id;
    const size = await api()
      .post(`/api/v1/admin/garments/${templateId}/sizes`)
      .set('Cookie', contentCookie)
      .send({
        code: 'M',
        label: 'Medium',
        status: 'PUBLISHED',
        measurements: [
          { key: 'chest_width', label: 'Chest width', valueMm: 540 },
          { key: 'body_length', label: 'Body length', valueMm: 720 },
        ],
      })
      .expect(HttpStatus.CREATED);
    sizeId = size.body.data.id;
    expect(size.body.data.measurements).toHaveLength(2);
    const variant = await api()
      .post(`/api/v1/admin/garments/${templateId}/variants`)
      .set('Cookie', contentCookie)
      .send({ colourId, sizeId, sku: 'TMS-TEE-BLK-M', status: 'PUBLISHED' })
      .expect(HttpStatus.CREATED);
    variantId = variant.body.data.id;
    const duplicate = await api()
      .post(`/api/v1/admin/garments/${templateId}/variants`)
      .set('Cookie', contentCookie)
      .send({ colourId, sizeId, sku: 'TMS-TEE-BLK-M', status: 'PUBLISHED' })
      .expect(HttpStatus.CONFLICT);
    expect(duplicate.body.error.code).toBe('CONFLICT');

    const other = await api()
      .post('/api/v1/admin/garments')
      .set('Cookie', contentCookie)
      .send({ slug: 'studio-hoodie', title: 'Studio Hoodie', type: 'HOODIE' })
      .expect(HttpStatus.CREATED);
    const crossTemplate = await api()
      .post(`/api/v1/admin/garments/${other.body.data.id}/variants`)
      .set('Cookie', contentCookie)
      .send({ colourId, sizeId, sku: 'INVALID-CROSS-TEMPLATE' })
      .expect(HttpStatus.BAD_REQUEST);
    expect(crossTemplate.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('enforces normalized placement geometry and publishes only a complete canvas', async () => {
    const invalid = await api()
      .post(`/api/v1/admin/garments/${templateId}/placements`)
      .set('Cookie', contentCookie)
      .send({
        slug: 'outside-canvas',
        name: 'Outside canvas',
        view: 'FRONT',
        xPermille: 800,
        yPermille: 100,
        widthPermille: 300,
        heightPermille: 500,
        printWidthMm: 300,
        printHeightMm: 400,
      })
      .expect(HttpStatus.BAD_REQUEST);
    expect(invalid.body.error.code).toBe('VALIDATION_FAILED');

    const placement = await api()
      .post(`/api/v1/admin/garments/${templateId}/placements`)
      .set('Cookie', contentCookie)
      .send({
        slug: 'center-chest',
        name: 'Center chest',
        view: 'FRONT',
        xPermille: 250,
        yPermille: 180,
        widthPermille: 500,
        heightPermille: 600,
        printWidthMm: 300,
        printHeightMm: 360,
      })
      .expect(HttpStatus.CREATED);
    placementId = placement.body.data.id;
    await api()
      .put(`/api/v1/admin/garments/placements/${placementId}`)
      .set('Cookie', contentCookie)
      .send({
        slug: 'center-chest',
        name: 'Center chest',
        view: 'FRONT',
        xPermille: 250,
        yPermille: 180,
        widthPermille: 500,
        heightPermille: 600,
        printWidthMm: 300,
        printHeightMm: 360,
        status: 'PUBLISHED',
      })
      .expect(HttpStatus.BAD_REQUEST);
    await api()
      .post(`/api/v1/admin/garments/placements/${placementId}/scale-presets`)
      .set('Cookie', contentCookie)
      .send({ slug: 'standard', name: 'Standard', scalePercent: 75, status: 'PUBLISHED' })
      .expect(HttpStatus.CREATED);
    await api()
      .put(`/api/v1/admin/garments/placements/${placementId}`)
      .set('Cookie', contentCookie)
      .send({
        slug: 'center-chest',
        name: 'Center chest',
        view: 'FRONT',
        xPermille: 250,
        yPermille: 180,
        widthPermille: 500,
        heightPermille: 600,
        printWidthMm: 300,
        printHeightMm: 360,
        status: 'PUBLISHED',
      })
      .expect(HttpStatus.OK);
    await api()
      .patch(`/api/v1/admin/garments/${templateId}`)
      .set('Cookie', contentCookie)
      .send({ status: 'PUBLISHED' })
      .expect(HttpStatus.OK);
    const published = await api().get('/api/v1/garments/studio-classic-tee').expect(HttpStatus.OK);
    expect(published.body.data).toMatchObject({
      id: templateId,
      status: 'PUBLISHED',
      variants: [expect.objectContaining({ id: variantId })],
      placements: [expect.objectContaining({ id: placementId, view: 'FRONT' })],
    });
    expect(published.body.data.compatibilities).toBeUndefined();
  });

  it('requires explicit approved artwork compatibility and exposes its placement allowlist', async () => {
    await api()
      .put(`/api/v1/admin/garments/${templateId}/compatibilities/${draftArtworkVersionId}`)
      .set('Cookie', contentCookie)
      .send({ status: 'APPROVED', placementIds: [placementId] })
      .expect(HttpStatus.BAD_REQUEST);
    await api()
      .put(`/api/v1/admin/garments/${templateId}/compatibilities/${artworkVersionId}`)
      .set('Cookie', contentCookie)
      .send({ status: 'APPROVED', placementIds: [] })
      .expect(HttpStatus.BAD_REQUEST);
    const approved = await api()
      .put(`/api/v1/admin/garments/${templateId}/compatibilities/${artworkVersionId}`)
      .set('Cookie', contentCookie)
      .send({ status: 'APPROVED', placementIds: [placementId] })
      .expect(HttpStatus.OK);
    expect(approved.body.data).toMatchObject({ status: 'APPROVED' });

    const compatible = await api()
      .get('/api/v1/artworks/midnight-signal/compatible-garments')
      .expect(HttpStatus.OK);
    expect(compatible.body.data).toHaveLength(1);
    expect(compatible.body.data[0]).toMatchObject({
      status: 'APPROVED',
      template: { id: templateId, slug: 'studio-classic-tee' },
    });
    expect(compatible.body.data[0].placements[0].placement.id).toBe(placementId);
    await api()
      .put(`/api/v1/admin/garments/placements/${placementId}`)
      .set('Cookie', contentCookie)
      .send({
        slug: 'center-chest',
        name: 'Changed without archival',
        view: 'FRONT',
        xPermille: 250,
        yPermille: 180,
        widthPermille: 500,
        heightPermille: 600,
        printWidthMm: 300,
        printHeightMm: 360,
        status: 'PUBLISHED',
      })
      .expect(HttpStatus.BAD_REQUEST);
    await api()
      .get('/api/v1/artworks/future-signal/compatible-garments')
      .expect(HttpStatus.NOT_FOUND);
  });

  it('validates only the exact approved immutable artwork and garment configuration', async () => {
    const valid = await api()
      .post('/api/v1/garment-configurations/validate')
      .send({
        artworkVersionId,
        garmentVariantId: variantId,
        placementId,
        scalePreset: 'standard',
        view: 'FRONT',
        quantity: 2,
      })
      .expect(HttpStatus.OK);
    expect(valid.body.data).toMatchObject({
      valid: true,
      artworkId,
      artworkVersionId,
      garmentTemplateId: templateId,
      garmentVariantId: variantId,
      placementId,
      view: 'FRONT',
      quantity: 2,
    });
    for (const invalid of [
      { scalePreset: 'oversized', view: 'FRONT' },
      { scalePreset: 'standard', view: 'BACK' },
    ]) {
      const response = await api()
        .post('/api/v1/garment-configurations/validate')
        .send({
          artworkVersionId,
          garmentVariantId: variantId,
          placementId,
          ...invalid,
          quantity: 1,
        })
        .expect(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(response.body.error.code).toBe('CONFIGURATION_NOT_APPROVED');
    }

    const replacement = await api()
      .post(`/api/v1/admin/artworks/${artworkId}/versions`)
      .set('Cookie', contentCookie)
      .send({ title: 'Midnight Signal Recut' })
      .expect(HttpStatus.CREATED);
    const replacementVersionId = replacement.body.data.versions[0].id as string;
    await api()
      .post(`/api/v1/admin/artworks/${artworkId}/versions/${replacementVersionId}/publish`)
      .set('Cookie', contentCookie)
      .expect(HttpStatus.OK);
    const unapprovedReplacement = await api()
      .post('/api/v1/garment-configurations/validate')
      .send({
        artworkVersionId: replacementVersionId,
        garmentVariantId: variantId,
        placementId,
        scalePreset: 'standard',
        view: 'FRONT',
      })
      .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(unapprovedReplacement.body.error.code).toBe('CONFIGURATION_NOT_APPROVED');
    expect(
      (await api().get('/api/v1/artworks/midnight-signal/compatible-garments').expect(200)).body
        .data,
    ).toEqual([]);
  });

  it('filters published garment pages and records successful mutations in the audit trail', async () => {
    const matching = await api()
      .get('/api/v1/garments?type=CLASSIC_TSHIRT&limit=1')
      .expect(HttpStatus.OK);
    expect(matching.body.data).toMatchObject({
      items: [expect.objectContaining({ id: templateId })],
      nextCursor: null,
    });
    const excluded = await api().get('/api/v1/garments?type=CAP').expect(HttpStatus.OK);
    expect(excluded.body.data.items).toEqual([]);
    const audits = await database.client.auditLog.findMany({
      where: { resourceType: 'garment', outcome: 'SUCCESS' },
    });
    expect(audits.map(({ action }) => action)).toEqual(
      expect.arrayContaining([
        'garment.template.create',
        'garment.variant.create',
        'garment.placement.update',
        'garment.compatibility.set',
      ]),
    );
  });
});
