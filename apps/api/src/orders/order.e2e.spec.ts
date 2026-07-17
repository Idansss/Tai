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
import { CartModule } from '../cart/cart.module.js';
import { DatabaseService } from '../database/database.service.js';
import { GarmentModule } from '../garments/garment.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { ApiExceptionFilter } from '../platform/api-exception.filter.js';
import { resolveCorrelationId } from '../platform/correlation-id.js';
import { OrderModule } from './order.module.js';
import { OrderService } from './order.service.js';

const execFile = promisify(execFileCallback);
const dockerExecutable = process.platform === 'win32' ? 'docker.exe' : 'docker';
const packageDirectory = fileURLToPath(new URL('../../../../packages/database', import.meta.url));
const prismaCli = fileURLToPath(
  new URL('../../../../packages/database/node_modules/prisma/build/index.js', import.meta.url),
);
const containerName = `tai-manic-order-test-${process.pid}-${randomUUID().slice(0, 8)}`;
const credentials = {
  database: 'tai_order_test',
  user: 'tai_order_test',
  password: 'order_test_only',
};
const adminPassword = 'correct order horse battery staple';
const shopperPassword = 'correct shopper horse battery staple';
const strangerPassword = 'correct stranger horse battery staple';
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
let orders: OrderService;
let databaseUrl = '';
let containerStarted = false;
let adminCookie = '';
let shopperCookie = '';
let strangerCookie = '';
let artworkId = '';
let artworkVersionId = '';
let templateId = '';
let compatibilityVersionId = '';
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

function checkout(overrides: Record<string, unknown> = {}) {
  return {
    address: { state: 'Lagos', city: 'Ikeja', line1: '10 Allen Avenue' },
    deliveryMethodId: 'STANDARD',
    contact: { email: 'guest@example.com', name: 'Guest Shopper' },
    ...overrides,
  };
}

async function createVariant(sku: string, colourSlug: string) {
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

async function guestCartWith(item: Record<string, unknown> = {}) {
  const guest = cookieNamed(await api().get('/api/v1/cart').expect(HttpStatus.OK), 'tms_cart')!;
  await api()
    .post('/api/v1/cart/items')
    .set('Cookie', guest)
    .send(line(item))
    .expect(HttpStatus.OK);
  return guest;
}

async function orderIdOf(reference: string) {
  const order = await database.client.order.findUniqueOrThrow({ where: { reference } });
  return order.id;
}

describe.sequential('checkout and order HTTP integration', () => {
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
      AUTH_TOKEN_PEPPER: 'order-e2e-token-pepper-at-least-32-chars',
      AUTH_RATE_LIMIT_MAX_ATTEMPTS: '50',
      ADMIN_MFA_ENCRYPTION_KEY: Buffer.alloc(32, 4).toString('base64url'),
    });
    await runPrisma(['migrate', 'deploy']);
    await runPrisma(['db', 'seed']);

    const module = await Test.createTestingModule({
      imports: [AuthModule, ArtworkModule, GarmentModule, InventoryModule, CartModule, OrderModule],
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
    orders = app.get(OrderService);

    const owner = await provisionAdmin(database.client, {
      email: 'order-admin@example.com',
      password: adminPassword,
      displayName: 'Order Admin',
      roleCode: 'OWNER',
      mfaRequired: false,
    });
    void owner;
    adminCookie = cookieNamed(
      await api()
        .post('/api/v1/admin/auth/login')
        .send({ email: 'order-admin@example.com', password: adminPassword })
        .expect(HttpStatus.OK),
      'tms_admin_session',
    )!;

    for (const [email, password] of [
      ['shopper@example.com', shopperPassword],
      ['stranger@example.com', strangerPassword],
    ] as const) {
      await api()
        .post('/api/v1/auth/register')
        .send({ email, password })
        .expect(HttpStatus.CREATED);
      await api()
        .post('/api/v1/auth/email-verification/confirm')
        .send({ token: emailProvider.tokenFor(email, 'auth-email-verification') })
        .expect(HttpStatus.OK);
    }
    shopperCookie = cookieNamed(
      await api()
        .post('/api/v1/auth/login')
        .send({ email: 'shopper@example.com', password: shopperPassword })
        .expect(HttpStatus.OK),
      'tms_session',
    )!;
    strangerCookie = cookieNamed(
      await api()
        .post('/api/v1/auth/login')
        .send({ email: 'stranger@example.com', password: strangerPassword })
        .expect(HttpStatus.OK),
      'tms_session',
    )!;

    const artwork = await api()
      .post('/api/v1/admin/artworks')
      .set('Cookie', adminCookie)
      .send({ slug: 'lagos-dawn', title: 'Lagos Dawn' })
      .expect(HttpStatus.CREATED);
    artworkId = artwork.body.data.id;
    artworkVersionId = artwork.body.data.versions[0].id;
    compatibilityVersionId = artworkVersionId;
    await api()
      .post(`/api/v1/admin/artworks/${artworkId}/versions/${artworkVersionId}/publish`)
      .set('Cookie', adminCookie)
      .expect(HttpStatus.OK);

    const template = await api()
      .post('/api/v1/admin/garments')
      .set('Cookie', adminCookie)
      .send({
        slug: 'order-classic-tee',
        title: 'Order Classic Tee',
        description: 'An approved blank canvas for order tests.',
        type: 'CLASSIC_TSHIRT',
        fabric: '240gsm cotton',
        fit: 'Regular',
        care: 'Cold wash inside out.',
      })
      .expect(HttpStatus.CREATED);
    templateId = template.body.data.id;
    variantId = await createVariant('ORDER-TEE-M', 'ink-black');
    scarceVariantId = await createVariant('ORDER-TEE-L', 'bone-white');

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
      .send({ quantity: 20 })
      .expect(HttpStatus.OK);
    await api()
      .post(`/api/v1/admin/inventory/${scarceVariantId}/receipts`)
      .set('Cookie', adminCookie)
      .send({ quantity: 1 })
      .expect(HttpStatus.OK);
  }, 180_000);

  afterAll(async () => {
    if (app) await app.close();
    if (containerStarted) await runDocker(['rm', '--force', containerName], 30_000);
  }, 45_000);

  it('quotes the authoritative delivery, tax, and total for the current cart', async () => {
    const guest = await guestCartWith({ quantity: 2 });

    const options = await api()
      .get('/api/v1/checkout/delivery-options?state=Lagos')
      .expect(HttpStatus.OK);
    const standard = options.body.data.find((option: { id: string }) => option.id === 'STANDARD');
    expect(standard).toMatchObject({ price: { amountMinor: 150_000, currency: 'NGN' } });

    const quote = await api()
      .post('/api/v1/checkout/quote')
      .set('Cookie', guest)
      .send({
        address: { state: 'Lagos', city: 'Ikeja', line1: '10 Allen Avenue' },
        deliveryMethodId: 'STANDARD',
      })
      .expect(HttpStatus.OK);
    // Subtotal 2,800,000; no discount; VAT 7.5% = 210,000; Lagos standard delivery 150,000.
    expect(quote.body.data).toMatchObject({
      subtotal: { amountMinor: 2_800_000 },
      discount: { amountMinor: 0 },
      tax: { amountMinor: 210_000 },
      delivery: { amountMinor: 150_000 },
      total: { amountMinor: 3_160_000 },
    });
  });

  it('refuses to check out an empty cart', async () => {
    const guest = cookieNamed(await api().get('/api/v1/cart').expect(HttpStatus.OK), 'tms_cart')!;
    const refused = await api()
      .post('/api/v1/orders')
      .set('Cookie', guest)
      .send(checkout())
      .expect(HttpStatus.CONFLICT);
    expect(refused.body.error.code).toBe('CONFLICT');
  });

  it('places a guest order with an immutable snapshot and empties the cart', async () => {
    const guest = await guestCartWith({ quantity: 2 });

    const placed = await api()
      .post('/api/v1/orders')
      .set('Cookie', guest)
      .send(checkout())
      .expect(HttpStatus.CREATED);
    const order = placed.body.data;
    expect(order.status).toBe('AWAITING_PAYMENT');
    expect(order.reference).toMatch(/^TMS-[0-9A-F]{10}$/);
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({
      quantity: 2,
      unitPrice: { amountMinor: 1_400_000, currency: 'NGN' },
      lineTotal: { amountMinor: 2_800_000, currency: 'NGN' },
      artworkTitle: 'Lagos Dawn',
      garmentTitle: 'Order Classic Tee',
      colourName: 'ink-black',
      sku: 'ORDER-TEE-M',
    });
    expect(order.total.amountMinor).toBe(3_160_000);
    expect(order.payment).toMatchObject({ status: 'PENDING', provider: null });
    expect(order.timeline).toEqual([expect.objectContaining({ status: 'AWAITING_PAYMENT' })]);

    // The cart is emptied once its lines become an immutable order.
    const cart = await api().get('/api/v1/cart').set('Cookie', guest).expect(HttpStatus.OK);
    expect(cart.body.data.items).toHaveLength(0);

    // The order holds stock: availability dropped by the ordered quantity without selling it yet.
    const item = await database.client.inventoryItem.findUniqueOrThrow({
      where: { variantId },
      include: { reservations: true },
    });
    expect(item.onHand).toBe(20);
    expect(item.reservations.some((reservation) => reservation.status === 'ACTIVE')).toBe(true);
  });

  it('copies price into the snapshot so a later price change never rewrites history', async () => {
    const guest = await guestCartWith({ quantity: 1 });
    const placed = await api()
      .post('/api/v1/orders')
      .set('Cookie', guest)
      .send(checkout())
      .expect(HttpStatus.CREATED);
    const reference = placed.body.data.reference;
    expect(placed.body.data.items[0].unitPrice.amountMinor).toBe(1_400_000);

    // The administrator later reprices the approved pair.
    await database.client.artworkGarmentCompatibility.updateMany({
      where: { artworkVersionId: compatibilityVersionId, templateId },
      data: { unitPriceMinor: 9_900_000 },
    });

    // The historical order is unchanged: it copied the price rather than referencing the pair.
    const order = await orders.getByReference(reference);
    expect(order.items[0]!.unitPrice.amountMinor).toBe(1_400_000);
    expect(order.total.amountMinor).toBe(1_400_000 + 105_000 + 150_000);

    await database.client.artworkGarmentCompatibility.updateMany({
      where: { artworkVersionId: compatibilityVersionId, templateId },
      data: { unitPriceMinor: price.unitPriceMinor },
    });
  });

  it('refuses checkout while any line is unavailable, before payment', async () => {
    const guest = await guestCartWith({ garmentVariantId: scarceVariantId, quantity: 1 });

    // The last unit is written off while it sits in the cart.
    await api()
      .post(`/api/v1/admin/inventory/${scarceVariantId}/adjustments`)
      .set('Cookie', adminCookie)
      .send({ quantityDelta: -1, reason: 'Damaged in the studio', kind: 'DAMAGE' })
      .expect(HttpStatus.OK);

    const refused = await api()
      .post('/api/v1/orders')
      .set('Cookie', guest)
      .send(checkout())
      .expect(HttpStatus.CONFLICT);
    expect(refused.body.error.code).toBe('CONFLICT');
    // Nothing was reserved and the cart still holds the (unavailable) line.
    const cart = await api().get('/api/v1/cart').set('Cookie', guest).expect(HttpStatus.OK);
    expect(cart.body.data.items).toHaveLength(1);

    await api()
      .post(`/api/v1/admin/inventory/${scarceVariantId}/receipts`)
      .set('Cookie', adminCookie)
      .send({ quantity: 1 })
      .expect(HttpStatus.OK);
  });

  it('lets a replayed checkout with the same idempotency key return the same order', async () => {
    // A fresh signed-in shopper cart.
    await api()
      .post('/api/v1/cart/items')
      .set('Cookie', shopperCookie)
      .send(line({ quantity: 1 }))
      .expect(HttpStatus.OK);

    const key = `idem-${randomUUID()}`;
    const first = await api()
      .post('/api/v1/orders')
      .set('Cookie', shopperCookie)
      .set('Idempotency-Key', key)
      .send(checkout({ contact: { email: 'shopper@example.com', name: 'Shopper' } }))
      .expect(HttpStatus.CREATED);

    const replay = await api()
      .post('/api/v1/orders')
      .set('Cookie', shopperCookie)
      .set('Idempotency-Key', key)
      .send(checkout({ contact: { email: 'shopper@example.com', name: 'Shopper' } }))
      .expect(HttpStatus.CREATED);

    expect(replay.body.data.reference).toBe(first.body.data.reference);
    const count = await database.client.order.count({ where: { idempotencyKey: key } });
    expect(count).toBe(1);
  });

  it('refuses a second checkout of the same drained cart', async () => {
    const guest = await guestCartWith({ quantity: 1 });
    await api()
      .post('/api/v1/orders')
      .set('Cookie', guest)
      .send(checkout())
      .expect(HttpStatus.CREATED);
    // The cart is empty now, so a naive resubmit fails rather than placing a duplicate.
    const again = await api()
      .post('/api/v1/orders')
      .set('Cookie', guest)
      .send(checkout())
      .expect(HttpStatus.CONFLICT);
    expect(again.body.error.code).toBe('CONFLICT');
  });

  it('loses the last unit to whoever checks out first', async () => {
    const first = await guestCartWith({ garmentVariantId: scarceVariantId, quantity: 1 });
    const second = await guestCartWith({ garmentVariantId: scarceVariantId, quantity: 1 });

    await api()
      .post('/api/v1/orders')
      .set('Cookie', first)
      .send(checkout())
      .expect(HttpStatus.CREATED);
    // The first order held the last unit, so the second cart now reads it as out of stock and
    // checkout refuses before payment rather than overselling (ADR-017). A browsing cart holds
    // nothing, so the customer can lose the last unit between cart and checkout — the deliberate
    // trade. The reservation path is a second guard for a genuine concurrent race.
    const refused = await api()
      .post('/api/v1/orders')
      .set('Cookie', second)
      .send(checkout())
      .expect(HttpStatus.CONFLICT);
    expect(refused.body.error.code).toBe('CONFLICT');
    // The second cart is not emptied: nothing was ordered.
    const cart = await api().get('/api/v1/cart').set('Cookie', second).expect(HttpStatus.OK);
    expect(cart.body.data.items).toHaveLength(1);
    expect(cart.body.data.hasIssues).toBe(true);

    await api()
      .post(`/api/v1/admin/inventory/${scarceVariantId}/receipts`)
      .set('Cookie', adminCookie)
      .send({ quantity: 1 })
      .expect(HttpStatus.OK);
  });

  it('commits stock on payment success and rejects invalid transitions', async () => {
    const guest = await guestCartWith({ quantity: 3 });
    const placed = await api()
      .post('/api/v1/orders')
      .set('Cookie', guest)
      .send(checkout())
      .expect(HttpStatus.CREATED);
    const orderId = await orderIdOf(placed.body.data.reference);
    const before = await database.client.inventoryItem.findUniqueOrThrow({ where: { variantId } });

    // A jump straight to DELIVERED is not a legal move from AWAITING_PAYMENT.
    await expect(
      orders.transition(orderId, 'DELIVERED', { correlationId: 'test' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    const paid = await orders.confirmPayment(orderId, { correlationId: 'test' });
    expect(paid.status).toBe('PAID');
    expect(paid.payment).toMatchObject({ status: 'SUCCEEDED' });
    // The sale committed: on-hand fell by the ordered quantity.
    const after = await database.client.inventoryItem.findUniqueOrThrow({ where: { variantId } });
    expect(before.onHand - after.onHand).toBe(3);

    // A second confirmation is not a legal move from PAID.
    await expect(orders.confirmPayment(orderId, { correlationId: 'test' })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('releases the hold when payment fails', async () => {
    const guest = await guestCartWith({ quantity: 2 });
    const placed = await api()
      .post('/api/v1/orders')
      .set('Cookie', guest)
      .send(checkout())
      .expect(HttpStatus.CREATED);
    const orderId = await orderIdOf(placed.body.data.reference);

    const failed = await orders.failPayment(orderId, {
      correlationId: 'test',
      reason: 'Card declined.',
    });
    expect(failed.status).toBe('PAYMENT_FAILED');
    expect(failed.payment).toMatchObject({ status: 'FAILED' });
    // The reservation is released, not committed: on-hand is unchanged.
    const reservations = await database.client.inventoryReservation.findMany({
      where: { reference: `order:${orderId}` },
    });
    expect(reservations.every((reservation) => reservation.status === 'RELEASED')).toBe(true);
  });

  it('will not confirm payment against a reservation that expired during checkout', async () => {
    const guest = await guestCartWith({ quantity: 1 });
    const placed = await api()
      .post('/api/v1/orders')
      .set('Cookie', guest)
      .send(checkout())
      .expect(HttpStatus.CREATED);
    const orderId = await orderIdOf(placed.body.data.reference);

    // The hold expires while the customer is still on the payment page.
    await database.client.inventoryReservation.updateMany({
      where: { reference: `order:${orderId}` },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    await expect(orders.confirmPayment(orderId, { correlationId: 'test' })).rejects.toMatchObject({
      code: 'INVENTORY_UNAVAILABLE',
    });
    // The order was not marked paid against stock that no longer exists.
    const order = await database.client.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe('AWAITING_PAYMENT');
  });

  it('shows a customer only their own orders', async () => {
    await api()
      .post('/api/v1/cart/items')
      .set('Cookie', shopperCookie)
      .send(line({ quantity: 1 }))
      .expect(HttpStatus.OK);
    const placed = await api()
      .post('/api/v1/orders')
      .set('Cookie', shopperCookie)
      .send(checkout({ contact: { email: 'shopper@example.com', name: 'Shopper' } }))
      .expect(HttpStatus.CREATED);
    const reference = placed.body.data.reference;

    const own = await api()
      .get('/api/v1/orders')
      .set('Cookie', shopperCookie)
      .expect(HttpStatus.OK);
    expect(
      own.body.data.some((summary: { reference: string }) => summary.reference === reference),
    ).toBe(true);
    const detail = await api()
      .get(`/api/v1/orders/${reference}`)
      .set('Cookie', shopperCookie)
      .expect(HttpStatus.OK);
    expect(detail.body.data.reference).toBe(reference);

    // Another customer cannot read it: not found rather than forbidden, so references cannot be probed.
    await api()
      .get(`/api/v1/orders/${reference}`)
      .set('Cookie', strangerCookie)
      .expect(HttpStatus.NOT_FOUND);
    // Reading order history requires a session.
    await api().get('/api/v1/orders').expect(HttpStatus.UNAUTHORIZED);
  });
});
