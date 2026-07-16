import { execFile as execFileCallback } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { HttpStatus, ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { EmailMessage, EmailProvider } from '@tms/email';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { provisionAdmin } from '../admin-auth/provision-admin.js';
import { ArtworkModule } from '../artworks/artwork.module.js';
import { AUTH_EMAIL_PROVIDER } from '../auth/auth.tokens.js';
import { DatabaseService } from '../database/database.service.js';
import { GarmentModule } from '../garments/garment.module.js';
import { ApiExceptionFilter } from '../platform/api-exception.filter.js';
import { resolveCorrelationId } from '../platform/correlation-id.js';
import { AuthModule } from '../auth/auth.module.js';
import { DesignModule } from './design.module.js';

const execFile = promisify(execFileCallback);
const dockerExecutable = process.platform === 'win32' ? 'docker.exe' : 'docker';
const packageDirectory = fileURLToPath(new URL('../../../../packages/database', import.meta.url));
const prismaCli = fileURLToPath(
  new URL('../../../../packages/database/node_modules/prisma/build/index.js', import.meta.url),
);
const containerName = `tai-manic-design-test-${process.pid}-${randomUUID().slice(0, 8)}`;
const credentials = {
  database: 'tai_design_test',
  user: 'tai_design_test',
  password: 'design_test_only',
};
const adminPassword = 'correct design horse battery staple';
const customerPassword = 'correct customer horse battery staple';

class FakeEmailProvider implements EmailProvider {
  readonly messages: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<{ messageId: string }> {
    this.messages.push(message);
    return { messageId: `test-${this.messages.length}` };
  }

  tokenFor(email: string, template: EmailMessage['template']): string {
    const message = [...this.messages]
      .reverse()
      .find((candidate) => candidate.to === email && candidate.template === template);
    const actionUrl = message?.variables.actionUrl;
    const token = actionUrl ? new URL(actionUrl).searchParams.get('token') : null;
    if (!token) throw new Error(`No ${template} token for ${email}.`);
    return token;
  }
}

const emailProvider = new FakeEmailProvider();

let app: INestApplication;
let database: DatabaseService;
let databaseUrl = '';
let containerStarted = false;
let adminCookie = '';
let ownerCookie = '';
let intruderCookie = '';
let artworkVersionId = '';
let draftArtworkVersionId = '';
let variantId = '';
let placementId = '';
let unapprovedPlacementId = '';
let designId = '';
let shareToken = '';

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
  if (!header) throw new Error('Missing session cookie.');
  return header.split(';', 1)[0]!;
}

async function registerCustomer(email: string) {
  await api()
    .post('/api/v1/auth/register')
    .send({ email, password: customerPassword })
    .expect(HttpStatus.CREATED);
  await api()
    .post('/api/v1/auth/email-verification/confirm')
    .send({ token: emailProvider.tokenFor(email, 'auth-email-verification') })
    .expect(HttpStatus.OK);
  return cookie(
    await api()
      .post('/api/v1/auth/login')
      .send({ email, password: customerPassword })
      .expect(HttpStatus.OK),
  );
}

function approvedDesign() {
  return {
    artworkVersionId,
    garmentVariantId: variantId,
    placementId,
    scalePreset: 'standard',
    view: 'FRONT' as const,
  };
}

describe.sequential('design configuration HTTP integration', () => {
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
      AUTH_TOKEN_PEPPER: 'design-e2e-token-pepper-at-least-32-chars',
      AUTH_RATE_LIMIT_MAX_ATTEMPTS: '50',
      ADMIN_MFA_ENCRYPTION_KEY: Buffer.alloc(32, 5).toString('base64url'),
    });
    await runPrisma(['migrate', 'deploy']);
    await runPrisma(['db', 'seed']);

    const module = await Test.createTestingModule({
      imports: [AuthModule, ArtworkModule, GarmentModule, DesignModule],
    })
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

    await provisionAdmin(database.client, {
      email: 'design-admin@example.com',
      password: adminPassword,
      displayName: 'Design Admin',
      roleCode: 'CONTENT_MANAGER',
      mfaRequired: false,
    });
    adminCookie = cookie(
      await api()
        .post('/api/v1/admin/auth/login')
        .send({ email: 'design-admin@example.com', password: adminPassword })
        .expect(HttpStatus.OK),
    );
    ownerCookie = await registerCustomer('design-owner@example.com');
    intruderCookie = await registerCustomer('design-intruder@example.com');

    const artwork = await api()
      .post('/api/v1/admin/artworks')
      .set('Cookie', adminCookie)
      .send({ slug: 'river-song', title: 'River Song' })
      .expect(HttpStatus.CREATED);
    const artworkId = artwork.body.data.id;
    artworkVersionId = artwork.body.data.versions[0].id;
    await api()
      .post(`/api/v1/admin/artworks/${artworkId}/versions/${artworkVersionId}/publish`)
      .set('Cookie', adminCookie)
      .expect(HttpStatus.OK);

    const draft = await api()
      .post('/api/v1/admin/artworks')
      .set('Cookie', adminCookie)
      .send({ slug: 'unreleased-song', title: 'Unreleased Song' })
      .expect(HttpStatus.CREATED);
    draftArtworkVersionId = draft.body.data.versions[0].id;

    const template = await api()
      .post('/api/v1/admin/garments')
      .set('Cookie', adminCookie)
      .send({
        slug: 'design-classic-tee',
        title: 'Design Classic Tee',
        description: 'An approved blank canvas for design tests.',
        type: 'CLASSIC_TSHIRT',
        fabric: '240gsm cotton',
        fit: 'Regular',
        care: 'Cold wash inside out.',
      })
      .expect(HttpStatus.CREATED);
    const templateId = template.body.data.id;

    const colour = await api()
      .post(`/api/v1/admin/garments/${templateId}/colours`)
      .set('Cookie', adminCookie)
      .send({ slug: 'washed-black', name: 'Washed Black', hex: '#111111', status: 'PUBLISHED' })
      .expect(HttpStatus.CREATED);
    const size = await api()
      .post(`/api/v1/admin/garments/${templateId}/sizes`)
      .set('Cookie', adminCookie)
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
    const variant = await api()
      .post(`/api/v1/admin/garments/${templateId}/variants`)
      .set('Cookie', adminCookie)
      .send({
        colourId: colour.body.data.id,
        sizeId: size.body.data.id,
        sku: 'DESIGN-TEE-BLK-M',
        status: 'PUBLISHED',
      })
      .expect(HttpStatus.CREATED);
    variantId = variant.body.data.id;

    const placement = await api()
      .post(`/api/v1/admin/garments/${templateId}/placements`)
      .set('Cookie', adminCookie)
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
      .post(`/api/v1/admin/garments/placements/${placementId}/scale-presets`)
      .set('Cookie', adminCookie)
      .send({ slug: 'standard', name: 'Standard', scalePercent: 100, status: 'PUBLISHED' })
      .expect(HttpStatus.CREATED);
    await api()
      .put(`/api/v1/admin/garments/placements/${placementId}`)
      .set('Cookie', adminCookie)
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

    const spare = await api()
      .post(`/api/v1/admin/garments/${templateId}/placements`)
      .set('Cookie', adminCookie)
      .send({
        slug: 'left-sleeve',
        name: 'Left sleeve',
        view: 'FRONT',
        xPermille: 80,
        yPermille: 300,
        widthPermille: 120,
        heightPermille: 140,
        printWidthMm: 80,
        printHeightMm: 90,
      })
      .expect(HttpStatus.CREATED);
    unapprovedPlacementId = spare.body.data.id;

    await api()
      .patch(`/api/v1/admin/garments/${templateId}`)
      .set('Cookie', adminCookie)
      .send({ status: 'PUBLISHED' })
      .expect(HttpStatus.OK);
    await api()
      .put(`/api/v1/admin/garments/${templateId}/compatibilities/${artworkVersionId}`)
      .set('Cookie', adminCookie)
      .send({
        status: 'APPROVED',
        placementIds: [placementId],
        unitPriceMinor: 1_400_000,
        currency: 'NGN',
      })
      .expect(HttpStatus.OK);
  }, 180_000);

  afterAll(async () => {
    if (app) await app.close();
    if (containerStarted) await runDocker(['rm', '--force', containerName], 30_000);
  }, 45_000);

  it('requires an authenticated customer session', async () => {
    await api().get('/api/v1/designs').expect(HttpStatus.UNAUTHORIZED);
    await api().post('/api/v1/designs').send(approvedDesign()).expect(HttpStatus.UNAUTHORIZED);
    // An administrator session is a different audience and must not act as a customer.
    await api().get('/api/v1/designs').set('Cookie', adminCookie).expect(HttpStatus.UNAUTHORIZED);
  });

  it('saves only an exact approved configuration', async () => {
    const unapprovedPlacement = await api()
      .post('/api/v1/designs')
      .set('Cookie', ownerCookie)
      .send({ ...approvedDesign(), placementId: unapprovedPlacementId })
      .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(unapprovedPlacement.body.error.code).toBe('CONFIGURATION_NOT_APPROVED');

    const unpublishedArtwork = await api()
      .post('/api/v1/designs')
      .set('Cookie', ownerCookie)
      .send({ ...approvedDesign(), artworkVersionId: draftArtworkVersionId })
      .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(unpublishedArtwork.body.error.code).toBe('CONFIGURATION_NOT_APPROVED');

    const unknownScale = await api()
      .post('/api/v1/designs')
      .set('Cookie', ownerCookie)
      .send({ ...approvedDesign(), scalePreset: 'enormous' })
      .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(unknownScale.body.error.code).toBe('CONFIGURATION_NOT_APPROVED');

    await api()
      .post('/api/v1/designs')
      .set('Cookie', ownerCookie)
      .send({ ...approvedDesign(), printX: 40 })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('persists the exact tuple and hashes it deterministically', async () => {
    const created = await api()
      .post('/api/v1/designs')
      .set('Cookie', ownerCookie)
      .send({ ...approvedDesign(), name: 'River tee' })
      .expect(HttpStatus.CREATED);
    designId = created.body.data.id;
    expect(created.body.data).toMatchObject({
      artworkVersionId,
      garmentVariantId: variantId,
      placementId,
      view: 'FRONT',
      name: 'River tee',
      visibility: 'PRIVATE',
      shareToken: null,
    });
    expect(created.body.data.configurationHash).toMatch(/^[0-9a-f]{64}$/);
    expect(created.body.data.scalePresetId).toEqual(expect.any(String));
    expect(created.body.data.garmentTemplateId).toEqual(expect.any(String));

    // Re-saving the same approved tuple is idempotent rather than a duplicate or a conflict.
    const again = await api()
      .post('/api/v1/designs')
      .set('Cookie', ownerCookie)
      .send({ ...approvedDesign(), name: 'A different name' })
      .expect(HttpStatus.OK);
    expect(again.body.data.id).toBe(designId);
    expect(again.body.data.name).toBe('River tee');
    expect(await database.client.designConfiguration.count()).toBe(1);
  });

  it('keeps one customer out of another customer design', async () => {
    const intruderList = await api()
      .get('/api/v1/designs')
      .set('Cookie', intruderCookie)
      .expect(HttpStatus.OK);
    expect(intruderList.body.data).toEqual([]);

    // Not found rather than forbidden, so identifiers cannot be probed for existence.
    const read = await api()
      .get(`/api/v1/designs/${designId}`)
      .set('Cookie', intruderCookie)
      .expect(HttpStatus.NOT_FOUND);
    expect(read.body.error.code).toBe('RESOURCE_NOT_FOUND');

    await api()
      .patch(`/api/v1/designs/${designId}`)
      .set('Cookie', intruderCookie)
      .send({ name: 'Stolen' })
      .expect(HttpStatus.NOT_FOUND);
    await api()
      .post(`/api/v1/designs/${designId}/share`)
      .set('Cookie', intruderCookie)
      .expect(HttpStatus.NOT_FOUND);
    await api()
      .delete(`/api/v1/designs/${designId}`)
      .set('Cookie', intruderCookie)
      .expect(HttpStatus.NOT_FOUND);

    const owner = await api()
      .get(`/api/v1/designs/${designId}`)
      .set('Cookie', ownerCookie)
      .expect(HttpStatus.OK);
    expect(owner.body.data.name).toBe('River tee');
  });

  it('shares a design through a stable unguessable token and never leaks the owner', async () => {
    const shared = await api()
      .post(`/api/v1/designs/${designId}/share`)
      .set('Cookie', ownerCookie)
      .expect(HttpStatus.OK);
    shareToken = shared.body.data.shareToken;
    expect(shared.body.data.visibility).toBe('UNLISTED');
    expect(shareToken).toMatch(/^[A-Za-z0-9_-]{32,64}$/);

    const anonymous = await api().get(`/api/v1/shared-designs/${shareToken}`).expect(HttpStatus.OK);
    expect(anonymous.body.data.id).toBe(designId);
    expect(anonymous.body.data.artworkVersionId).toBe(artworkVersionId);
    // A shared read must never disclose the owner or re-disclose the token.
    expect(anonymous.body.data.shareToken).toBeNull();
    expect(JSON.stringify(anonymous.body)).not.toContain('design-owner@example.com');

    // The link is stable across repeated reads.
    const again = await api().get(`/api/v1/shared-designs/${shareToken}`).expect(HttpStatus.OK);
    expect(again.body.data.id).toBe(designId);

    await api().get('/api/v1/shared-designs/not-a-real-token').expect(HttpStatus.NOT_FOUND);
  });

  it('revokes and rotates a share link', async () => {
    const rotated = await api()
      .post(`/api/v1/designs/${designId}/share`)
      .set('Cookie', ownerCookie)
      .expect(HttpStatus.OK);
    expect(rotated.body.data.shareToken).not.toBe(shareToken);
    // The previous link must stop working the moment it is rotated.
    await api().get(`/api/v1/shared-designs/${shareToken}`).expect(HttpStatus.NOT_FOUND);
    const rotatedToken = rotated.body.data.shareToken;
    await api().get(`/api/v1/shared-designs/${rotatedToken}`).expect(HttpStatus.OK);

    const revoked = await api()
      .patch(`/api/v1/designs/${designId}`)
      .set('Cookie', ownerCookie)
      .send({ visibility: 'PRIVATE' })
      .expect(HttpStatus.OK);
    expect(revoked.body.data.visibility).toBe('PRIVATE');
    expect(revoked.body.data.shareToken).toBeNull();
    await api().get(`/api/v1/shared-designs/${rotatedToken}`).expect(HttpStatus.NOT_FOUND);
  });

  it('renames, rejects an empty update, and deletes a design', async () => {
    await api()
      .patch(`/api/v1/designs/${designId}`)
      .set('Cookie', ownerCookie)
      .send({})
      .expect(HttpStatus.BAD_REQUEST);

    const renamed = await api()
      .patch(`/api/v1/designs/${designId}`)
      .set('Cookie', ownerCookie)
      .send({ name: 'Renamed tee' })
      .expect(HttpStatus.OK);
    expect(renamed.body.data.name).toBe('Renamed tee');
    expect(renamed.body.data.configurationHash).toMatch(/^[0-9a-f]{64}$/);

    await api()
      .delete(`/api/v1/designs/${designId}`)
      .set('Cookie', ownerCookie)
      .expect(HttpStatus.NO_CONTENT);
    await api()
      .get(`/api/v1/designs/${designId}`)
      .set('Cookie', ownerCookie)
      .expect(HttpStatus.NOT_FOUND);
    expect(await database.client.designConfiguration.count()).toBe(0);

    // Deleting a design must never touch the artwork version or garment it referenced.
    expect(await database.client.artworkVersion.count({ where: { id: artworkVersionId } })).toBe(1);
    expect(await database.client.garmentVariant.count({ where: { id: variantId } })).toBe(1);
  });
});
