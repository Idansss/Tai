import { execFile as execFileCallback } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { HttpStatus, ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MediaProcessingStatus } from '@tms/database';
import type { ObjectStorage, StoredObject } from '@tms/media';
import type { NextFunction, Request, Response } from 'express';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { provisionAdmin } from '../admin-auth/provision-admin.js';
import { ArtworkModule } from '../artworks/artwork.module.js';
import { DatabaseService } from '../database/database.service.js';
import { GarmentModule } from '../garments/garment.module.js';
import { ApiExceptionFilter } from '../platform/api-exception.filter.js';
import { resolveCorrelationId } from '../platform/correlation-id.js';
import { MediaModule } from './media.module.js';
import { MEDIA_QUEUE, MEDIA_STORAGE, type MediaQueuePublisher } from './media.tokens.js';

const execFile = promisify(execFileCallback);
const dockerExecutable = process.platform === 'win32' ? 'docker.exe' : 'docker';
const packageDirectory = fileURLToPath(new URL('../../../../packages/database', import.meta.url));
const prismaCli = fileURLToPath(
  new URL('../../../../packages/database/node_modules/prisma/build/index.js', import.meta.url),
);
const containerName = `tai-manic-media-test-${process.pid}-${randomUUID().slice(0, 8)}`;
const credentials = {
  database: 'tai_media_test',
  user: 'tai_media_test',
  password: 'media_test_only',
};
const password = 'correct media horse battery staple';

/** The literal EICAR antivirus test signature the default scanner recognises. */
const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

class InMemoryStorage implements ObjectStorage {
  readonly objects = new Map<string, StoredObject>();

  async put(object: StoredObject): Promise<void> {
    this.objects.set(object.key, object);
  }

  async get(key: string): Promise<Uint8Array> {
    const stored = this.objects.get(key);
    if (!stored) throw new Error(`No stored object for ${key}.`);
    return stored.body;
  }

  async signedGetUrl(key: string, expiresInSeconds = 300): Promise<string> {
    return `https://storage.invalid/${key}?expires=${expiresInSeconds}`;
  }
}

class RecordingQueue implements MediaQueuePublisher {
  readonly jobs: Array<{ originalAssetId: string; processingJobId: string }> = [];
  unavailable = false;

  async enqueue(input: { originalAssetId: string; processingJobId: string }): Promise<void> {
    if (this.unavailable) throw new Error('The queue is unavailable.');
    this.jobs.push(input);
  }
}

const storage = new InMemoryStorage();
const queue = new RecordingQueue();

let app: INestApplication;
let database: DatabaseService;
let databaseUrl = '';
let containerStarted = false;
let contentCookie = '';
let analystCookie = '';
let artworkId = '';
let artworkVersionId = '';
let otherVersionId = '';
let templateId = '';
let placementId = '';
let unapprovedPlacementId = '';
let originalAssetId = '';
let mockupAssetId = '';

async function png(width = 1200, height = 1000): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 4, background: '#6611aa' } })
    .png()
    .toBuffer();
}

async function jpeg(width = 1200, height = 1000): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#22aa55' } })
    .jpeg()
    .toBuffer();
}

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
  return cookie(
    await api().post('/api/v1/admin/auth/login').send({ email, password }).expect(HttpStatus.OK),
  );
}

function mediaPath(versionId = artworkVersionId) {
  return `/api/v1/admin/artworks/${artworkId}/versions/${versionId}/media`;
}

describe.sequential('artwork media pipeline HTTP integration', () => {
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
      AUTH_TOKEN_PEPPER: 'media-e2e-token-pepper-at-least-32-chars',
      AUTH_RATE_LIMIT_MAX_ATTEMPTS: '50',
      ADMIN_MFA_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString('base64url'),
    });
    delete process.env.MEDIA_MALWARE_SCAN_URL;
    await runPrisma(['migrate', 'deploy']);
    await runPrisma(['db', 'seed']);

    const module = await Test.createTestingModule({
      imports: [ArtworkModule, GarmentModule, MediaModule],
    })
      .overrideProvider(MEDIA_STORAGE)
      .useValue(storage)
      .overrideProvider(MEDIA_QUEUE)
      .useValue(queue)
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
      email: 'media-content@example.com',
      password,
      displayName: 'Media Content',
      roleCode: 'CONTENT_MANAGER',
      mfaRequired: false,
    });
    await provisionAdmin(database.client, {
      email: 'media-analyst@example.com',
      password,
      displayName: 'Media Analyst',
      roleCode: 'ANALYST',
      mfaRequired: false,
    });
    contentCookie = await login('media-content@example.com');
    analystCookie = await login('media-analyst@example.com');

    const artwork = await api()
      .post('/api/v1/admin/artworks')
      .set('Cookie', contentCookie)
      .send({ slug: 'harbour-lights', title: 'Harbour Lights' })
      .expect(HttpStatus.CREATED);
    artworkId = artwork.body.data.id;
    artworkVersionId = artwork.body.data.versions[0].id;
    await api()
      .post(`/api/v1/admin/artworks/${artworkId}/versions/${artworkVersionId}/publish`)
      .set('Cookie', contentCookie)
      .expect(HttpStatus.OK);

    const other = await api()
      .post('/api/v1/admin/artworks')
      .set('Cookie', contentCookie)
      .send({ slug: 'other-artwork', title: 'Other Artwork' })
      .expect(HttpStatus.CREATED);
    otherVersionId = other.body.data.versions[0].id;

    const template = await api()
      .post('/api/v1/admin/garments')
      .set('Cookie', contentCookie)
      .send({
        slug: 'media-classic-tee',
        title: 'Media Classic Tee',
        description: 'An approved blank canvas for media tests.',
        type: 'CLASSIC_TSHIRT',
        fabric: '240gsm cotton',
        fit: 'Regular',
        care: 'Cold wash inside out.',
      })
      .expect(HttpStatus.CREATED);
    templateId = template.body.data.id;

    const colour = await api()
      .post(`/api/v1/admin/garments/${templateId}/colours`)
      .set('Cookie', contentCookie)
      .send({ slug: 'washed-black', name: 'Washed Black', hex: '#111111', status: 'PUBLISHED' })
      .expect(HttpStatus.CREATED);
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
    await api()
      .post(`/api/v1/admin/garments/${templateId}/variants`)
      .set('Cookie', contentCookie)
      .send({
        colourId: colour.body.data.id,
        sizeId: size.body.data.id,
        sku: 'MEDIA-TEE-BLK-M',
        status: 'PUBLISHED',
      })
      .expect(HttpStatus.CREATED);

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
      .post(`/api/v1/admin/garments/placements/${placementId}/scale-presets`)
      .set('Cookie', contentCookie)
      .send({ slug: 'standard', name: 'Standard', scalePercent: 100, status: 'PUBLISHED' })
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

    const spare = await api()
      .post(`/api/v1/admin/garments/${templateId}/placements`)
      .set('Cookie', contentCookie)
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
      .set('Cookie', contentCookie)
      .send({ status: 'PUBLISHED' })
      .expect(HttpStatus.OK);
    await api()
      .put(`/api/v1/admin/garments/${templateId}/compatibilities/${artworkVersionId}`)
      .set('Cookie', contentCookie)
      .send({ status: 'APPROVED', placementIds: [placementId] })
      .expect(HttpStatus.OK);
  }, 180_000);

  afterAll(async () => {
    if (app) await app.close();
    if (containerStarted) await runDocker(['rm', '--force', containerName], 30_000);
  }, 45_000);

  it('requires authentication and separates catalogue read from write permission', async () => {
    await api().get(mediaPath()).expect(HttpStatus.UNAUTHORIZED);
    await api().get(mediaPath()).set('Cookie', analystCookie).expect(HttpStatus.OK);

    const denied = await api()
      .post(`${mediaPath()}/original`)
      .set('Cookie', analystCookie)
      .attach('file', await png(), { filename: 'art.png', contentType: 'image/png' })
      .expect(HttpStatus.FORBIDDEN);
    expect(denied.body.error.code).toBe('PERMISSION_DENIED');
    expect(storage.objects.size).toBe(0);
  });

  it('rejects a version that does not belong to the artwork', async () => {
    const response = await api()
      .get(mediaPath(otherVersionId))
      .set('Cookie', contentCookie)
      .expect(HttpStatus.NOT_FOUND);
    expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('rejects MIME spoofing, bad dimensions, and a missing file before object storage', async () => {
    const spoofed = await api()
      .post(`${mediaPath()}/original`)
      .set('Cookie', contentCookie)
      .attach('file', await jpeg(), { filename: 'art.png', contentType: 'image/png' })
      .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(spoofed.body.error.code).toBe('MEDIA_VALIDATION_FAILED');

    const tooSmall = await api()
      .post(`${mediaPath()}/original`)
      .set('Cookie', contentCookie)
      .attach('file', await png(200, 200), { filename: 'small.png', contentType: 'image/png' })
      .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(tooSmall.body.error.code).toBe('MEDIA_VALIDATION_FAILED');

    const missing = await api()
      .post(`${mediaPath()}/original`)
      .set('Cookie', contentCookie)
      .expect(HttpStatus.BAD_REQUEST);
    expect(missing.body.error.code).toBe('MEDIA_VALIDATION_FAILED');

    expect(storage.objects.size).toBe(0);
  });

  it('rejects a malware signature carried inside a decodable image', async () => {
    const infected = Buffer.concat([await png(), Buffer.from(eicar, 'latin1')]);
    const response = await api()
      .post(`${mediaPath()}/original`)
      .set('Cookie', contentCookie)
      .attach('file', infected, { filename: 'infected.png', contentType: 'image/png' })
      .expect(HttpStatus.UNPROCESSABLE_ENTITY);

    expect(response.body.error.code).toBe('MEDIA_INFECTED');
    expect(storage.objects.size).toBe(0);
    expect(await database.client.artworkAsset.count()).toBe(0);
  });

  it('records a safe retryable failure when the derivative queue is unavailable', async () => {
    queue.unavailable = true;
    const response = await api()
      .post(`${mediaPath()}/original`)
      .set('Cookie', contentCookie)
      .attach('file', await png(), { filename: 'art.png', contentType: 'image/png' })
      .expect(HttpStatus.SERVICE_UNAVAILABLE);
    queue.unavailable = false;

    expect(response.body.error.code).toBe('MEDIA_PROCESSING_FAILED');
    const asset = await database.client.artworkAsset.findFirstOrThrow({
      where: { kind: 'ORIGINAL' },
    });
    expect(asset.processingStatus).toBe(MediaProcessingStatus.FAILED);
    expect(asset.failureCode).not.toBeNull();
    expect(storage.objects.size).toBe(1);
    originalAssetId = asset.id;
  });

  it('retries only a failed job and re-queues it exactly once', async () => {
    const retried = await api()
      .post(`/api/v1/admin/media/originals/${originalAssetId}/retry`)
      .set('Cookie', contentCookie)
      .expect(HttpStatus.OK);
    expect(retried.body.data.processingStatus).toBe('QUEUED');
    expect(retried.body.data.failureCode).toBeNull();
    expect(queue.jobs).toHaveLength(1);
    expect(queue.jobs[0]!.originalAssetId).toBe(originalAssetId);

    const conflict = await api()
      .post(`/api/v1/admin/media/originals/${originalAssetId}/retry`)
      .set('Cookie', contentCookie)
      .expect(HttpStatus.CONFLICT);
    expect(conflict.body.error.code).toBe('CONFLICT');
    expect(queue.jobs).toHaveLength(1);
  });

  it('keeps the immutable original and its unfinished derivatives out of public media', async () => {
    const admin = await api().get(mediaPath()).set('Cookie', contentCookie).expect(HttpStatus.OK);
    expect(admin.body.data).toHaveLength(1);
    expect(admin.body.data[0].kind).toBe('ORIGINAL');
    expect(admin.body.data[0].url).toContain('https://storage.invalid/');

    const published = await api()
      .get('/api/v1/artworks/harbour-lights/media')
      .expect(HttpStatus.OK);
    expect(published.body.data).toEqual([]);
  });

  it('accepts only an approved exact-version garment placement for a mockup', async () => {
    const unapproved = await api()
      .post(`${mediaPath()}/mockups`)
      .set('Cookie', contentCookie)
      .field('garmentTemplateId', templateId)
      .field('garmentPlacementId', unapprovedPlacementId)
      .attach('file', await png(), { filename: 'mockup.png', contentType: 'image/png' })
      .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(unapproved.body.error.code).toBe('CONFIGURATION_NOT_APPROVED');

    const mockup = await api()
      .post(`${mediaPath()}/mockups`)
      .set('Cookie', contentCookie)
      .field('garmentTemplateId', templateId)
      .field('garmentPlacementId', placementId)
      .attach('file', await png(), { filename: 'mockup.png', contentType: 'image/png' })
      .expect(HttpStatus.CREATED);
    expect(mockup.body.data.kind).toBe('MOCKUP');
    expect(mockup.body.data.approvalStatus).toBe('PENDING');
    mockupAssetId = mockup.body.data.id;
  });

  it('keeps a mockup private until an explicit approval decision', async () => {
    const pending = await api().get('/api/v1/artworks/harbour-lights/media').expect(HttpStatus.OK);
    expect(pending.body.data).toEqual([]);

    const missingReason = await api()
      .patch(`/api/v1/admin/media/mockups/${mockupAssetId}/approval`)
      .set('Cookie', contentCookie)
      .send({ status: 'REJECTED' })
      .expect(HttpStatus.BAD_REQUEST);
    expect(missingReason.body.error.code).toBe('VALIDATION_FAILED');

    const denied = await api()
      .patch(`/api/v1/admin/media/mockups/${mockupAssetId}/approval`)
      .set('Cookie', analystCookie)
      .send({ status: 'APPROVED' })
      .expect(HttpStatus.FORBIDDEN);
    expect(denied.body.error.code).toBe('PERMISSION_DENIED');

    const rejected = await api()
      .patch(`/api/v1/admin/media/mockups/${mockupAssetId}/approval`)
      .set('Cookie', contentCookie)
      .send({ status: 'REJECTED', reason: 'The placement registration is off.' })
      .expect(HttpStatus.OK);
    expect(rejected.body.data.approvalStatus).toBe('REJECTED');
    const afterRejection = await api()
      .get('/api/v1/artworks/harbour-lights/media')
      .expect(HttpStatus.OK);
    expect(afterRejection.body.data).toEqual([]);

    const approved = await api()
      .patch(`/api/v1/admin/media/mockups/${mockupAssetId}/approval`)
      .set('Cookie', contentCookie)
      .send({ status: 'APPROVED' })
      .expect(HttpStatus.OK);
    expect(approved.body.data.approvalStatus).toBe('APPROVED');
    expect(approved.body.data.rejectionReason).toBeNull();

    const publicMedia = await api()
      .get('/api/v1/artworks/harbour-lights/media')
      .expect(HttpStatus.OK);
    expect(publicMedia.body.data).toHaveLength(1);
    expect(publicMedia.body.data[0].id).toBe(mockupAssetId);
    expect(publicMedia.body.data.some((asset: { kind: string }) => asset.kind === 'ORIGINAL')).toBe(
      false,
    );
  });

  it('records an audit trail for every media mutation', async () => {
    const actions = await database.client.auditLog.findMany({
      where: { action: { startsWith: 'media.' } },
      select: { action: true },
    });
    expect(actions.map((entry) => entry.action)).toEqual(
      expect.arrayContaining([
        'media.original.ingest',
        'media.derivatives.retry',
        'media.mockup.ingest',
        'media.mockup.rejected',
        'media.mockup.approved',
      ]),
    );
  });
});
