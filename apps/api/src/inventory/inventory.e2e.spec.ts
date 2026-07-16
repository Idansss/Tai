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
import { GarmentModule } from '../garments/garment.module.js';
import { ApiExceptionFilter } from '../platform/api-exception.filter.js';
import { resolveCorrelationId } from '../platform/correlation-id.js';
import { InventoryModule } from './inventory.module.js';
import { InventoryService } from './inventory.service.js';

const execFile = promisify(execFileCallback);
const dockerExecutable = process.platform === 'win32' ? 'docker.exe' : 'docker';
const packageDirectory = fileURLToPath(new URL('../../../../packages/database', import.meta.url));
const prismaCli = fileURLToPath(
  new URL('../../../../packages/database/node_modules/prisma/build/index.js', import.meta.url),
);
const containerName = `tai-manic-inventory-test-${process.pid}-${randomUUID().slice(0, 8)}`;
const credentials = {
  database: 'tai_inventory_test',
  user: 'tai_inventory_test',
  password: 'inventory_test_only',
};
const password = 'correct inventory horse battery staple';

let app: INestApplication;
let database: DatabaseService;
let inventory: InventoryService;
let databaseUrl = '';
let containerStarted = false;
let fulfilmentCookie = '';
let analystCookie = '';
let contentCookie = '';
let templateId = '';
let variantId = '';
let raceVariantId = '';

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

async function createVariant(sku: string, colourSlug: string) {
  const colour = await api()
    .post(`/api/v1/admin/garments/${templateId}/colours`)
    .set('Cookie', contentCookie)
    .send({ slug: colourSlug, name: colourSlug, hex: '#222222', status: 'PUBLISHED' })
    .expect(HttpStatus.CREATED);
  const size = await api()
    .post(`/api/v1/admin/garments/${templateId}/sizes`)
    .set('Cookie', contentCookie)
    .send({
      code: sku,
      label: sku,
      status: 'PUBLISHED',
      measurements: [{ key: 'chest_width', label: 'Chest width', valueMm: 540 }],
    })
    .expect(HttpStatus.CREATED);
  const variant = await api()
    .post(`/api/v1/admin/garments/${templateId}/variants`)
    .set('Cookie', contentCookie)
    .send({
      colourId: colour.body.data.id,
      sizeId: size.body.data.id,
      sku,
      status: 'PUBLISHED',
    })
    .expect(HttpStatus.CREATED);
  return variant.body.data.id as string;
}

describe.sequential('garment inventory and reservation HTTP integration', () => {
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
      AUTH_TOKEN_PEPPER: 'inventory-e2e-token-pepper-at-least-32',
      AUTH_RATE_LIMIT_MAX_ATTEMPTS: '50',
      ADMIN_MFA_ENCRYPTION_KEY: Buffer.alloc(32, 3).toString('base64url'),
    });
    await runPrisma(['migrate', 'deploy']);
    await runPrisma(['db', 'seed']);

    const module = await Test.createTestingModule({
      imports: [ArtworkModule, GarmentModule, InventoryModule],
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
    inventory = app.get(InventoryService);

    for (const [email, roleCode] of [
      ['inventory-fulfilment@example.com', 'FULFILMENT_OPERATOR'],
      ['inventory-analyst@example.com', 'ANALYST'],
      ['inventory-content@example.com', 'CONTENT_MANAGER'],
    ] as const) {
      await provisionAdmin(database.client, {
        email,
        password,
        displayName: roleCode,
        roleCode,
        mfaRequired: false,
      });
    }
    fulfilmentCookie = await login('inventory-fulfilment@example.com');
    analystCookie = await login('inventory-analyst@example.com');
    contentCookie = await login('inventory-content@example.com');

    const template = await api()
      .post('/api/v1/admin/garments')
      .set('Cookie', contentCookie)
      .send({
        slug: 'inventory-classic-tee',
        title: 'Inventory Classic Tee',
        description: 'An approved blank canvas for inventory tests.',
        type: 'CLASSIC_TSHIRT',
        fabric: '240gsm cotton',
        fit: 'Regular',
        care: 'Cold wash inside out.',
      })
      .expect(HttpStatus.CREATED);
    templateId = template.body.data.id;
    variantId = await createVariant('INV-TEE-M', 'ink-black');
    raceVariantId = await createVariant('INV-TEE-L', 'bone-white');
  }, 180_000);

  afterAll(async () => {
    if (app) await app.close();
    if (containerStarted) await runDocker(['rm', '--force', containerName], 30_000);
  }, 45_000);

  it('separates inventory read from write and denies unrelated roles entirely', async () => {
    await api().get('/api/v1/admin/inventory').expect(HttpStatus.UNAUTHORIZED);
    await api().get('/api/v1/admin/inventory').set('Cookie', analystCookie).expect(HttpStatus.OK);

    // An analyst may see stock but never move it.
    const analystWrite = await api()
      .post(`/api/v1/admin/inventory/${variantId}/receipts`)
      .set('Cookie', analystCookie)
      .send({ quantity: 5 })
      .expect(HttpStatus.FORBIDDEN);
    expect(analystWrite.body.error.code).toBe('PERMISSION_DENIED');

    // A content manager has no inventory permission at all.
    await api()
      .get('/api/v1/admin/inventory')
      .set('Cookie', contentCookie)
      .expect(HttpStatus.FORBIDDEN);
  });

  it('receives stock and records an append-only ledger entry', async () => {
    const received = await api()
      .post(`/api/v1/admin/inventory/${variantId}/receipts`)
      .set('Cookie', fulfilmentCookie)
      .send({ quantity: 10, reference: 'PO-1001' })
      .expect(HttpStatus.OK);
    expect(received.body.data).toMatchObject({
      variantId,
      sku: 'INV-TEE-M',
      onHand: 10,
      reserved: 0,
      available: 10,
    });

    const movements = await api()
      .get(`/api/v1/admin/inventory/${variantId}/movements`)
      .set('Cookie', fulfilmentCookie)
      .expect(HttpStatus.OK);
    expect(movements.body.data).toHaveLength(1);
    expect(movements.body.data[0]).toMatchObject({
      kind: 'RECEIPT',
      quantityDelta: 10,
      onHandAfter: 10,
      reference: 'PO-1001',
    });
  });

  it('refuses to rewrite the stock ledger', async () => {
    const movement = await database.client.inventoryMovement.findFirstOrThrow();
    await expect(
      database.client.inventoryMovement.update({
        where: { id: movement.id },
        data: { quantityDelta: 9999 },
      }),
    ).rejects.toThrow(/append-only/);
    await expect(
      database.client.inventoryMovement.delete({ where: { id: movement.id } }),
    ).rejects.toThrow(/append-only/);
  });

  it('requires a reason to adjust and never lets stock go negative', async () => {
    await api()
      .post(`/api/v1/admin/inventory/${variantId}/adjustments`)
      .set('Cookie', fulfilmentCookie)
      .send({ quantityDelta: -1 })
      .expect(HttpStatus.BAD_REQUEST);

    // A movement that moves nothing is a bug, not a record.
    await api()
      .post(`/api/v1/admin/inventory/${variantId}/adjustments`)
      .set('Cookie', fulfilmentCookie)
      .send({ quantityDelta: 0, reason: 'No change' })
      .expect(HttpStatus.BAD_REQUEST);

    const belowZero = await api()
      .post(`/api/v1/admin/inventory/${variantId}/adjustments`)
      .set('Cookie', fulfilmentCookie)
      .send({ quantityDelta: -50, reason: 'Stocktake write-off' })
      .expect(HttpStatus.BAD_REQUEST);
    expect(belowZero.body.error.code).toBe('VALIDATION_FAILED');

    const damaged = await api()
      .post(`/api/v1/admin/inventory/${variantId}/adjustments`)
      .set('Cookie', fulfilmentCookie)
      .send({ quantityDelta: -2, reason: 'Water damage', kind: 'DAMAGE' })
      .expect(HttpStatus.OK);
    expect(damaged.body.data).toMatchObject({ onHand: 8, available: 8 });

    // The database is the last line of defence, independent of the application.
    await expect(
      database.client.$executeRawUnsafe(
        `UPDATE inventory_items SET on_hand = -1 WHERE variant_id = '${variantId}'`,
      ),
    ).rejects.toThrow(/inventory_items_on_hand_check/);
  });

  it('holds stock against availability without moving it, and frees it on release', async () => {
    const reservation = await inventory.reserve({
      variantId,
      quantity: 3,
      reference: 'cart-release',
      ttlSeconds: 900,
    });
    const held = await inventory.getLevel(variantId);
    // A hold reduces availability but must not move stock.
    expect(held).toMatchObject({ onHand: 8, reserved: 3, available: 5 });

    await inventory.release(reservation.id);
    expect(await inventory.getLevel(variantId)).toMatchObject({
      onHand: 8,
      reserved: 0,
      available: 8,
    });

    // Releasing twice is idempotent rather than an error.
    await inventory.release(reservation.id);
    expect(await inventory.getLevel(variantId)).toMatchObject({ reserved: 0, available: 8 });
  });

  it('stops an administrator adjusting away stock that is already promised', async () => {
    const reservation = await inventory.reserve({
      variantId,
      quantity: 6,
      reference: 'cart-promised',
      ttlSeconds: 900,
    });
    const conflict = await api()
      .post(`/api/v1/admin/inventory/${variantId}/adjustments`)
      .set('Cookie', fulfilmentCookie)
      .send({ quantityDelta: -5, reason: 'Move to studio' })
      .expect(HttpStatus.CONFLICT);
    expect(conflict.body.error.code).toBe('INVENTORY_UNAVAILABLE');

    // Reducing only as far as the promised quantity is still allowed.
    const allowed = await api()
      .post(`/api/v1/admin/inventory/${variantId}/adjustments`)
      .set('Cookie', fulfilmentCookie)
      .send({ quantityDelta: -2, reason: 'Move to studio' })
      .expect(HttpStatus.OK);
    expect(allowed.body.data).toMatchObject({ onHand: 6, reserved: 6, available: 0 });
    await inventory.release(reservation.id);
  });

  it('releases an expired hold and refuses to commit it', async () => {
    const reservation = await inventory.reserve({
      variantId,
      quantity: 6,
      reference: 'cart-expiring',
      ttlSeconds: 1,
    });
    expect(await inventory.getLevel(variantId)).toMatchObject({ reserved: 6, available: 0 });

    await new Promise((resolve) => setTimeout(resolve, 1_100));

    // The hot path expires lazily, so availability returns without any sweeper running.
    expect(await inventory.getLevel(variantId)).toMatchObject({ reserved: 0, available: 6 });
    // The freed units are genuinely sellable again, not merely reported as free.
    const resold = await inventory.reserve({
      variantId,
      quantity: 6,
      reference: 'cart-after-expiry',
      ttlSeconds: 900,
    });
    expect(resold.quantity).toBe(6);
    await inventory.release(resold.id);

    // An expired hold's units may already belong to someone else, so it can never be committed.
    await expect(inventory.commit(reservation.id)).rejects.toMatchObject({
      code: 'INVENTORY_UNAVAILABLE',
    });
    expect(await database.client.inventoryReservation.count({ where: { status: 'EXPIRED' } })).toBe(
      1,
    );
    const swept = await inventory.sweepExpired();
    expect(swept).toBe(0);
  });

  it('commits a live hold into a sale exactly once', async () => {
    const before = await inventory.getLevel(variantId);
    const reservation = await inventory.reserve({
      variantId,
      quantity: 1,
      reference: 'order-commit',
      ttlSeconds: 900,
    });
    const after = await inventory.commit(reservation.id);
    expect(after.onHand).toBe(before.onHand - 1);
    expect(after.reserved).toBe(before.reserved);

    const movements = await inventory.listMovements(variantId);
    const sale = movements.at(-1)!;
    expect(sale).toMatchObject({ kind: 'SALE', quantityDelta: -1, reference: 'order-commit' });

    // Committing twice must not sell the same unit twice.
    await expect(inventory.commit(reservation.id)).rejects.toMatchObject({
      code: 'INVENTORY_UNAVAILABLE',
    });
  });

  it('sells the final unit exactly once under concurrent reservation', async () => {
    await api()
      .post(`/api/v1/admin/inventory/${raceVariantId}/receipts`)
      .set('Cookie', fulfilmentCookie)
      .send({ quantity: 1 })
      .expect(HttpStatus.OK);

    // Twelve shoppers reach for the same last unit at the same moment.
    const attempts = await Promise.allSettled(
      Array.from({ length: 12 }, (_, index) =>
        inventory.reserve({
          variantId: raceVariantId,
          quantity: 1,
          reference: `race-${index}`,
          ttlSeconds: 900,
        }),
      ),
    );
    const won = attempts.filter((attempt) => attempt.status === 'fulfilled');
    const lost = attempts.filter((attempt) => attempt.status === 'rejected');

    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(11);
    for (const attempt of lost) {
      expect((attempt as PromiseRejectedResult).reason).toMatchObject({
        code: 'INVENTORY_UNAVAILABLE',
      });
    }
    expect(await inventory.getLevel(raceVariantId)).toMatchObject({
      onHand: 1,
      reserved: 1,
      available: 0,
    });
  });

  it('commits the final unit without ever going negative', async () => {
    const active = await database.client.inventoryReservation.findFirstOrThrow({
      where: { status: 'ACTIVE', item: { variantId: raceVariantId } },
    });
    const level = await inventory.commit(active.id);
    expect(level).toMatchObject({ onHand: 0, reserved: 0, available: 0 });

    // With nothing left, the next shopper is refused rather than oversold.
    await expect(
      inventory.reserve({
        variantId: raceVariantId,
        quantity: 1,
        reference: 'race-late',
        ttlSeconds: 900,
      }),
    ).rejects.toMatchObject({ code: 'INVENTORY_UNAVAILABLE' });
  });

  it('flags low stock against its threshold and audits every mutation', async () => {
    await api()
      .put(`/api/v1/admin/inventory/${raceVariantId}/threshold`)
      .set('Cookie', fulfilmentCookie)
      .send({ lowStockThreshold: 2 })
      .expect(HttpStatus.OK);

    const alerts = await api()
      .get('/api/v1/admin/inventory?lowStockOnly=true')
      .set('Cookie', analystCookie)
      .expect(HttpStatus.OK);
    expect(alerts.body.data.map((level: { sku: string }) => level.sku)).toContain('INV-TEE-L');

    const audits = await database.client.auditLog.findMany({
      where: { resourceType: 'inventory', outcome: 'SUCCESS' },
      select: { action: true },
    });
    expect(audits.map(({ action }) => action)).toEqual(
      expect.arrayContaining(['inventory.receive', 'inventory.adjust', 'inventory.threshold.set']),
    );
  });
});
