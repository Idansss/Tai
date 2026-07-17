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
import { AuthModule } from '../auth/auth.module.js';
import { AUTH_EMAIL_PROVIDER } from '../auth/auth.tokens.js';
import { DatabaseService } from '../database/database.service.js';
import { GarmentModule } from '../garments/garment.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { ApiExceptionFilter } from '../platform/api-exception.filter.js';
import { resolveCorrelationId } from '../platform/correlation-id.js';
import { CartModule } from './cart.module.js';

const execFile = promisify(execFileCallback);
const dockerExecutable = process.platform === 'win32' ? 'docker.exe' : 'docker';
const packageDirectory = fileURLToPath(new URL('../../../../packages/database', import.meta.url));
const prismaCli = fileURLToPath(
  new URL('../../../../packages/database/node_modules/prisma/build/index.js', import.meta.url),
);
const containerName = `tai-manic-cart-test-${process.pid}-${randomUUID().slice(0, 8)}`;
const credentials = {
  database: 'tai_cart_test',
  user: 'tai_cart_test',
  password: 'cart_test_only',
};
const adminPassword = 'correct cart horse battery staple';
const customerPassword = 'correct shopper horse battery staple';
/** 14,000 naira in kobo. */
const price = { unitPriceMinor: 1_400_000, currency: 'NGN' };

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
    const url = message?.variables.actionUrl;
    const token = url ? new URL(url).searchParams.get('token') : null;
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
let shopperCookie = '';
let ownerUserId = '';
let artworkVersionId = '';
let variantId = '';
let scarceVariantId = '';
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

function cookieNamed(response: request.Response, name: string) {
  const raw = response.headers['set-cookie'];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const header = list.find((value) => value.startsWith(`${name}=`));
  return header ? header.split(';', 1)[0]! : undefined;
}

function line(overrides: Record<string, unknown> = {}) {
  return {
    artworkVersionId,
    garmentVariantId: variantId,
    placementId,
    scalePreset: 'standard',
    view: 'FRONT',
    quantity: 1,
    ...overrides,
  };
}

async function createVariant(sku: string, colourSlug: string, templateId: string) {
  const colour = await api()
    .post(`/api/v1/admin/garments/${templateId}/colours`)
    .set('Cookie', adminCookie)
    .send({ slug: colourSlug, name: colourSlug, hex: '#333333', status: 'PUBLISHED' })
    .expect(HttpStatus.CREATED);
  const size = await api()
    .post(`/api/v1/admin/garments/${templateId}/sizes`)
    .set('Cookie', adminCookie)
    .send({
      code: sku,
      label: sku,
      status: 'PUBLISHED',
      measurements: [{ key: 'chest_width', label: 'Chest width', valueMm: 540 }],
    })
    .expect(HttpStatus.CREATED);
  const variant = await api()
    .post(`/api/v1/admin/garments/${templateId}/variants`)
    .set('Cookie', adminCookie)
    .send({ colourId: colour.body.data.id, sizeId: size.body.data.id, sku, status: 'PUBLISHED' })
    .expect(HttpStatus.CREATED);
  return variant.body.data.id as string;
}

describe.sequential('cart and promotion HTTP integration', () => {
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
      AUTH_TOKEN_PEPPER: 'cart-e2e-token-pepper-at-least-32-chars',
      AUTH_RATE_LIMIT_MAX_ATTEMPTS: '50',
      ADMIN_MFA_ENCRYPTION_KEY: Buffer.alloc(32, 4).toString('base64url'),
    });
    await runPrisma(['migrate', 'deploy']);
    await runPrisma(['db', 'seed']);

    const module = await Test.createTestingModule({
      imports: [AuthModule, ArtworkModule, GarmentModule, InventoryModule, CartModule],
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

    const owner = await provisionAdmin(database.client, {
      email: 'cart-admin@example.com',
      password: adminPassword,
      displayName: 'Cart Admin',
      roleCode: 'OWNER',
      mfaRequired: false,
    });
    ownerUserId = owner.id;
    adminCookie = cookieNamed(
      await api()
        .post('/api/v1/admin/auth/login')
        .send({ email: 'cart-admin@example.com', password: adminPassword })
        .expect(HttpStatus.OK),
      'tms_admin_session',
    )!;

    await api()
      .post('/api/v1/auth/register')
      .send({ email: 'shopper@example.com', password: customerPassword })
      .expect(HttpStatus.CREATED);
    await api()
      .post('/api/v1/auth/email-verification/confirm')
      .send({ token: emailProvider.tokenFor('shopper@example.com', 'auth-email-verification') })
      .expect(HttpStatus.OK);
    shopperCookie = cookieNamed(
      await api()
        .post('/api/v1/auth/login')
        .send({ email: 'shopper@example.com', password: customerPassword })
        .expect(HttpStatus.OK),
      'tms_session',
    )!;

    const artwork = await api()
      .post('/api/v1/admin/artworks')
      .set('Cookie', adminCookie)
      .send({ slug: 'lagos-dusk', title: 'Lagos Dusk' })
      .expect(HttpStatus.CREATED);
    const artworkId = artwork.body.data.id;
    artworkVersionId = artwork.body.data.versions[0].id;
    await api()
      .post(`/api/v1/admin/artworks/${artworkId}/versions/${artworkVersionId}/publish`)
      .set('Cookie', adminCookie)
      .expect(HttpStatus.OK);

    const template = await api()
      .post('/api/v1/admin/garments')
      .set('Cookie', adminCookie)
      .send({
        slug: 'cart-classic-tee',
        title: 'Cart Classic Tee',
        description: 'An approved blank canvas for cart tests.',
        type: 'CLASSIC_TSHIRT',
        fabric: '240gsm cotton',
        fit: 'Regular',
        care: 'Cold wash inside out.',
      })
      .expect(HttpStatus.CREATED);
    const templateId = template.body.data.id;
    variantId = await createVariant('CART-TEE-M', 'ink-black', templateId);
    scarceVariantId = await createVariant('CART-TEE-L', 'bone-white', templateId);

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
    await api()
      .patch(`/api/v1/admin/garments/${templateId}`)
      .set('Cookie', adminCookie)
      .send({ status: 'PUBLISHED' })
      .expect(HttpStatus.OK);
    await api()
      .put(`/api/v1/admin/garments/${templateId}/compatibilities/${artworkVersionId}`)
      .set('Cookie', adminCookie)
      .send({ status: 'APPROVED', placementIds: [placementId], ...price })
      .expect(HttpStatus.OK);

    await api()
      .post(`/api/v1/admin/inventory/${variantId}/receipts`)
      .set('Cookie', adminCookie)
      .send({ quantity: 10 })
      .expect(HttpStatus.OK);
    await api()
      .post(`/api/v1/admin/inventory/${scarceVariantId}/receipts`)
      .set('Cookie', adminCookie)
      .send({ quantity: 1 })
      .expect(HttpStatus.OK);

    await database.client.promotion.createMany({
      data: [
        {
          code: 'WELCOME10',
          label: '10% off your first order',
          kind: 'PERCENT_OFF',
          value: 10,
          status: 'ACTIVE',
          createdByUserId: ownerUserId,
        },
        {
          code: 'BIGSPEND',
          label: '5,000 naira off orders over 50,000',
          kind: 'FIXED_AMOUNT',
          value: 500_000,
          currency: 'NGN',
          status: 'ACTIVE',
          minSubtotalMinor: 5_000_000,
          createdByUserId: ownerUserId,
        },
        {
          code: 'EXPIRED',
          label: 'Ended promotion',
          kind: 'PERCENT_OFF',
          value: 50,
          status: 'ACTIVE',
          endsAt: new Date(Date.now() - 60_000),
          createdByUserId: ownerUserId,
        },
        {
          code: 'DRAFTONLY',
          label: 'Not launched',
          kind: 'PERCENT_OFF',
          value: 90,
          status: 'DRAFT',
          createdByUserId: ownerUserId,
        },
      ],
    });
  }, 180_000);

  afterAll(async () => {
    if (app) await app.close();
    if (containerStarted) await runDocker(['rm', '--force', containerName], 30_000);
  }, 45_000);

  it('gives an anonymous shopper a cart and never accepts a browser price', async () => {
    const empty = await api().get('/api/v1/cart').expect(HttpStatus.OK);
    const guest = cookieNamed(empty, 'tms_cart');
    expect(guest).toBeDefined();
    expect(empty.body.data).toMatchObject({
      items: [],
      subtotal: { amountMinor: 0, currency: 'NGN' },
      total: { amountMinor: 0 },
      promotion: null,
      hasIssues: false,
    });

    // A price supplied by the browser is rejected outright rather than quietly ignored.
    await api()
      .post('/api/v1/cart/items')
      .set('Cookie', guest!)
      .send({ ...line(), unitPriceMinor: 1 })
      .expect(HttpStatus.BAD_REQUEST);

    const added = await api()
      .post('/api/v1/cart/items')
      .set('Cookie', guest!)
      .send(line({ quantity: 2 }))
      .expect(HttpStatus.OK);
    expect(added.body.data.items).toHaveLength(1);
    expect(added.body.data.items[0]).toMatchObject({
      quantity: 2,
      unitPrice: { amountMinor: 1_400_000, currency: 'NGN' },
      lineTotal: { amountMinor: 2_800_000, currency: 'NGN' },
      issue: null,
      // The line renders from its own response, with no catalogue re-join (TMS-FBR-020).
      display: {
        artworkTitle: 'Lagos Dusk',
        artworkSlug: 'lagos-dusk',
        garmentTitle: 'Cart Classic Tee',
        colourName: 'ink-black',
        colourHex: '#333333',
        sizeLabel: 'CART-TEE-M',
        placementName: 'Center chest',
        scaleName: 'Standard',
        thumbnailUrl: null,
      },
    });
    expect(added.body.data.subtotal).toEqual({ amountMinor: 2_800_000, currency: 'NGN' });
  });

  it('refuses an unapproved configuration and merges identical ones onto one line', async () => {
    const guest = cookieNamed(await api().get('/api/v1/cart').expect(HttpStatus.OK), 'tms_cart')!;

    const unapproved = await api()
      .post('/api/v1/cart/items')
      .set('Cookie', guest)
      .send(line({ scalePreset: 'enormous' }))
      .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(unapproved.body.error.code).toBe('CONFIGURATION_NOT_APPROVED');

    await api().post('/api/v1/cart/items').set('Cookie', guest).send(line()).expect(HttpStatus.OK);
    const again = await api()
      .post('/api/v1/cart/items')
      .set('Cookie', guest)
      .send(line({ quantity: 3 }))
      .expect(HttpStatus.OK);
    // The same configuration merges rather than creating a second line.
    expect(again.body.data.items).toHaveLength(1);
    expect(again.body.data.items[0].quantity).toBe(4);
  });

  it('refuses a quantity that stock cannot fulfil', async () => {
    const guest = cookieNamed(await api().get('/api/v1/cart').expect(HttpStatus.OK), 'tms_cart')!;
    const scarce = line({ garmentVariantId: scarceVariantId, quantity: 2 });

    const tooMany = await api()
      .post('/api/v1/cart/items')
      .set('Cookie', guest)
      .send(scarce)
      .expect(HttpStatus.CONFLICT);
    expect(tooMany.body.error.code).toBe('INVENTORY_UNAVAILABLE');

    const ok = await api()
      .post('/api/v1/cart/items')
      .set('Cookie', guest)
      .send(line({ garmentVariantId: scarceVariantId, quantity: 1 }))
      .expect(HttpStatus.OK);
    expect(ok.body.data.items[0]).toMatchObject({ quantity: 1, availableQuantity: 1, issue: null });

    // Raising the quantity beyond stock is refused too, and the line is left untouched.
    const lineId = ok.body.data.items[0].lineId;
    await api()
      .patch(`/api/v1/cart/items/${lineId}`)
      .set('Cookie', guest)
      .send({ quantity: 5 })
      .expect(HttpStatus.CONFLICT);
    const after = await api().get('/api/v1/cart').set('Cookie', guest).expect(HttpStatus.OK);
    expect(after.body.data.items[0].quantity).toBe(1);
  });

  it('reports a line that went out of stock instead of silently dropping it', async () => {
    const guest = cookieNamed(await api().get('/api/v1/cart').expect(HttpStatus.OK), 'tms_cart')!;
    await api()
      .post('/api/v1/cart/items')
      .set('Cookie', guest)
      .send(line({ garmentVariantId: scarceVariantId, quantity: 1 }))
      .expect(HttpStatus.OK);

    // The last unit is written off while the cart sits there.
    await api()
      .post(`/api/v1/admin/inventory/${scarceVariantId}/adjustments`)
      .set('Cookie', adminCookie)
      .send({ quantityDelta: -1, reason: 'Damaged in the studio', kind: 'DAMAGE' })
      .expect(HttpStatus.OK);

    const cart = await api().get('/api/v1/cart').set('Cookie', guest).expect(HttpStatus.OK);
    const scarceLine = cart.body.data.items.find(
      (item: { garmentVariantId: string }) => item.garmentVariantId === scarceVariantId,
    );
    expect(scarceLine).toMatchObject({ issue: 'OUT_OF_STOCK', availableQuantity: 0 });
    expect(cart.body.data.hasIssues).toBe(true);
    // An unavailable line must not be billed for.
    expect(cart.body.data.subtotal.amountMinor).toBe(0);

    await api()
      .post(`/api/v1/admin/inventory/${scarceVariantId}/receipts`)
      .set('Cookie', adminCookie)
      .send({ quantity: 1 })
      .expect(HttpStatus.OK);
  });

  it('applies a percentage promotion and rejects invalid codes safely', async () => {
    const guest = cookieNamed(await api().get('/api/v1/cart').expect(HttpStatus.OK), 'tms_cart')!;
    await api()
      .post('/api/v1/cart/items')
      .set('Cookie', guest)
      .send(line({ quantity: 2 }))
      .expect(HttpStatus.OK);

    for (const code of ['NOSUCHCODE', 'EXPIRED', 'DRAFTONLY']) {
      const rejected = await api()
        .post('/api/v1/cart/promotion')
        .set('Cookie', guest)
        .send({ code })
        .expect(HttpStatus.UNPROCESSABLE_ENTITY);
      // One safe answer: an unknown, ended, and unlaunched code are indistinguishable.
      expect(rejected.body.error).toMatchObject({
        code: 'PROMOTION_INVALID',
        message: 'That promotion code is not valid.',
      });
    }

    const applied = await api()
      .post('/api/v1/cart/promotion')
      .set('Cookie', guest)
      .send({ code: 'welcome10' })
      .expect(HttpStatus.OK);
    expect(applied.body.data.promotion).toMatchObject({
      code: 'WELCOME10',
      discount: { amountMinor: 280_000, currency: 'NGN' },
    });
    expect(applied.body.data.total.amountMinor).toBe(2_520_000);

    // A fixed-amount code below its minimum contributes nothing rather than erroring.
    const belowMinimum = await api()
      .post('/api/v1/cart/promotion')
      .set('Cookie', guest)
      .send({ code: 'BIGSPEND' })
      .expect(HttpStatus.OK);
    expect(belowMinimum.body.data.promotion).toBeNull();
    expect(belowMinimum.body.data.total.amountMinor).toBe(2_800_000);

    const removed = await api()
      .delete('/api/v1/cart/promotion')
      .set('Cookie', guest)
      .expect(HttpStatus.OK);
    expect(removed.body.data.promotion).toBeNull();
  });

  it('never discounts below zero', async () => {
    const guest = cookieNamed(await api().get('/api/v1/cart').expect(HttpStatus.OK), 'tms_cart')!;
    await api().post('/api/v1/cart/items').set('Cookie', guest).send(line()).expect(HttpStatus.OK);
    await database.client.promotion.create({
      data: {
        code: 'HUGE',
        label: 'Larger than any cart',
        kind: 'FIXED_AMOUNT',
        value: 99_000_000,
        currency: 'NGN',
        status: 'ACTIVE',
        createdByUserId: ownerUserId,
      },
    });
    const applied = await api()
      .post('/api/v1/cart/promotion')
      .set('Cookie', guest)
      .send({ code: 'HUGE' })
      .expect(HttpStatus.OK);
    expect(applied.body.data.promotion!.discount.amountMinor).toBe(1_400_000);
    expect(applied.body.data.total.amountMinor).toBe(0);
  });

  it('merges a guest cart into the customer cart on sign-in without losing quantities', async () => {
    const guest = cookieNamed(await api().get('/api/v1/cart').expect(HttpStatus.OK), 'tms_cart')!;
    await api()
      .post('/api/v1/cart/items')
      .set('Cookie', guest)
      .send(line({ quantity: 3 }))
      .expect(HttpStatus.OK);

    // The customer already had the same configuration saved from another device.
    await api()
      .post('/api/v1/cart/items')
      .set('Cookie', shopperCookie)
      .send(line({ quantity: 2 }))
      .expect(HttpStatus.OK);

    const merged = await api()
      .get('/api/v1/cart')
      .set('Cookie', [shopperCookie, guest])
      .expect(HttpStatus.OK);
    expect(merged.body.data.items).toHaveLength(1);
    expect(merged.body.data.items[0].quantity).toBe(5);
    // The guest cart is consumed, not left behind to resurrect later.
    expect(
      await database.client.cart.count({ where: { guestToken: { not: null } } }),
    ).toBeGreaterThanOrEqual(0);
    const guestToken = guest.split('=')[1];
    expect(await database.client.cart.findUnique({ where: { guestToken } })).toBeNull();

    // Signing in again is stable rather than re-merging.
    const stable = await api()
      .get('/api/v1/cart')
      .set('Cookie', shopperCookie)
      .expect(HttpStatus.OK);
    expect(stable.body.data.items[0].quantity).toBe(5);
  });

  it('keeps one shopper out of another cart line', async () => {
    const mine = await api().get('/api/v1/cart').set('Cookie', shopperCookie).expect(HttpStatus.OK);
    const lineId = mine.body.data.items[0].lineId;
    const stranger = cookieNamed(
      await api().get('/api/v1/cart').expect(HttpStatus.OK),
      'tms_cart',
    )!;

    // Not found rather than forbidden, so line identifiers cannot be probed.
    await api()
      .patch(`/api/v1/cart/items/${lineId}`)
      .set('Cookie', stranger)
      .send({ quantity: 1 })
      .expect(HttpStatus.NOT_FOUND);
    await api()
      .delete(`/api/v1/cart/items/${lineId}`)
      .set('Cookie', stranger)
      .expect(HttpStatus.NOT_FOUND);

    const removed = await api()
      .delete(`/api/v1/cart/items/${lineId}`)
      .set('Cookie', shopperCookie)
      .expect(HttpStatus.OK);
    expect(removed.body.data.items).toHaveLength(0);
  });
});
