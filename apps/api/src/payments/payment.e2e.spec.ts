import { execFile as execFileCallback } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
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
import { OrderModule } from '../orders/order.module.js';
import { ApiExceptionFilter } from '../platform/api-exception.filter.js';
import { resolveCorrelationId } from '../platform/correlation-id.js';
import { PaymentModule } from './payment.module.js';
import { PaymentService } from './payment.service.js';

const execFile = promisify(execFileCallback);
const dockerExecutable = process.platform === 'win32' ? 'docker.exe' : 'docker';
const packageDirectory = fileURLToPath(new URL('../../../../packages/database', import.meta.url));
const prismaCli = fileURLToPath(
  new URL('../../../../packages/database/node_modules/prisma/build/index.js', import.meta.url),
);
const containerName = `tai-manic-payment-test-${process.pid}-${randomUUID().slice(0, 8)}`;
const credentials = {
  database: 'tai_payment_test',
  user: 'tai_payment_test',
  password: 'payment_test_only',
};
const adminPassword = 'correct payment horse battery staple';
const webhookSecret = 'payment-e2e-webhook-secret-32chars';
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
let payments: PaymentService;
let databaseUrl = '';
let containerStarted = false;
let adminCookie = '';
let artworkVersionId = '';
let templateId = '';
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

function checkout(email: string) {
  return {
    address: { state: 'Lagos', city: 'Ikeja', line1: '10 Allen Avenue' },
    deliveryMethodId: 'STANDARD',
    contact: { email, name: 'Payment Shopper' },
  };
}

/** Places a fresh guest order and returns its reference and total. */
async function placeOrder(email = 'shopper@example.com', quantity = 1) {
  const guest = cookieNamed(await api().get('/api/v1/cart').expect(HttpStatus.OK), 'tms_cart')!;
  await api()
    .post('/api/v1/cart/items')
    .set('Cookie', guest)
    .send(line({ quantity }))
    .expect(HttpStatus.OK);
  const placed = await api()
    .post('/api/v1/orders')
    .set('Cookie', guest)
    .send(checkout(email))
    .expect(HttpStatus.CREATED);
  return {
    reference: placed.body.data.reference as string,
    totalMinor: placed.body.data.total.amountMinor as number,
  };
}

function signedWebhook(
  providerReference: string,
  status: string,
  amountMinor: number,
  options: { eventId?: string; currency?: string } = {},
) {
  const body = JSON.stringify({
    id: options.eventId ?? `evt_${randomUUID()}`,
    type: `payment.${status.toLowerCase()}`,
    data: {
      reference: providerReference,
      status,
      amountMinor,
      currency: options.currency ?? 'NGN',
    },
  });
  const signature = createHmac('sha256', webhookSecret).update(body).digest('hex');
  return { body, signature };
}

function postWebhook(body: string, signature: string | undefined) {
  const req = api().post('/api/v1/payments/webhooks/mock').set('Content-Type', 'application/json');
  if (signature !== undefined) req.set('x-tms-signature', signature);
  return req.send(body);
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

describe.sequential('payment provider HTTP integration', () => {
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
      AUTH_TOKEN_PEPPER: 'payment-e2e-token-pepper-at-least-32-chars',
      AUTH_RATE_LIMIT_MAX_ATTEMPTS: '50',
      ADMIN_MFA_ENCRYPTION_KEY: Buffer.alloc(32, 4).toString('base64url'),
      PAYMENT_PROVIDER: 'mock',
      MOCK_PAYMENT_WEBHOOK_SECRET: webhookSecret,
    });
    await runPrisma(['migrate', 'deploy']);
    await runPrisma(['db', 'seed']);

    const module = await Test.createTestingModule({
      imports: [
        AuthModule,
        ArtworkModule,
        GarmentModule,
        InventoryModule,
        CartModule,
        OrderModule,
        PaymentModule,
      ],
    })
      .overrideProvider(AUTH_EMAIL_PROVIDER)
      .useValue(emailProvider)
      .compile();
    app = module.createNestApplication({ rawBody: true });
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
    payments = app.get(PaymentService);

    await provisionAdmin(database.client, {
      email: 'payment-admin@example.com',
      password: adminPassword,
      displayName: 'Payment Admin',
      roleCode: 'OWNER',
      mfaRequired: false,
    });
    adminCookie = cookieNamed(
      await api()
        .post('/api/v1/admin/auth/login')
        .send({ email: 'payment-admin@example.com', password: adminPassword })
        .expect(HttpStatus.OK),
      'tms_admin_session',
    )!;

    const artwork = await api()
      .post('/api/v1/admin/artworks')
      .set('Cookie', adminCookie)
      .send({ slug: 'lagos-night', title: 'Lagos Night' })
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
        slug: 'payment-classic-tee',
        title: 'Payment Classic Tee',
        description: 'An approved blank canvas for payment tests.',
        type: 'CLASSIC_TSHIRT',
        fabric: '240gsm cotton',
        fit: 'Regular',
        care: 'Cold wash inside out.',
      })
      .expect(HttpStatus.CREATED);
    templateId = template.body.data.id;
    variantId = await createVariant('PAY-TEE-M', 'ink-black');

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
      .send({ quantity: 100 })
      .expect(HttpStatus.OK);
  }, 180_000);

  afterAll(async () => {
    if (app) await app.close();
    if (containerStarted) await runDocker(['rm', '--force', containerName], 30_000);
  }, 45_000);

  it('completes a mock checkout end to end through a signed webhook', async () => {
    const { reference, totalMinor } = await placeOrder();
    const before = await database.client.inventoryItem.findUniqueOrThrow({ where: { variantId } });

    const initiated = await api().post(`/api/v1/orders/${reference}/payment`).expect(HttpStatus.OK);
    expect(initiated.body.data).toMatchObject({ status: 'PENDING', provider: 'mock' });
    expect(initiated.body.data.reference).toMatch(/^mock_/);
    expect(initiated.body.data.redirectUrl).toContain(initiated.body.data.reference);

    // Initiating moved the order into processing.
    const processing = await database.client.order.findUniqueOrThrow({ where: { reference } });
    expect(processing.status).toBe('PAYMENT_PROCESSING');

    const providerReference = initiated.body.data.reference as string;
    const { body, signature } = signedWebhook(providerReference, 'SUCCEEDED', totalMinor);
    await postWebhook(body, signature).expect(HttpStatus.OK);

    const paid = await database.client.order.findUniqueOrThrow({ where: { reference } });
    expect(paid.status).toBe('PAID');
    const after = await database.client.inventoryItem.findUniqueOrThrow({ where: { variantId } });
    expect(before.onHand - after.onHand).toBe(1);

    const handoff = await api().get(`/api/v1/orders/${reference}/payment`).expect(HttpStatus.OK);
    expect(handoff.body.data.status).toBe('SUCCEEDED');
  });

  it('processes a replayed webhook exactly once', async () => {
    const { reference, totalMinor } = await placeOrder();
    const providerReference = (
      await api().post(`/api/v1/orders/${reference}/payment`).expect(HttpStatus.OK)
    ).body.data.reference as string;
    const before = await database.client.inventoryItem.findUniqueOrThrow({ where: { variantId } });

    const event = signedWebhook(providerReference, 'SUCCEEDED', totalMinor, {
      eventId: 'evt_dup_1',
    });
    await postWebhook(event.body, event.signature).expect(HttpStatus.OK);
    // The exact same signed event, replayed, is a no-op.
    await postWebhook(event.body, event.signature).expect(HttpStatus.OK);

    const after = await database.client.inventoryItem.findUniqueOrThrow({ where: { variantId } });
    expect(before.onHand - after.onHand).toBe(1); // committed once, not twice
    const events = await database.client.paymentEvent.count({
      where: { providerEventId: 'evt_dup_1' },
    });
    expect(events).toBe(1);
    const order = await database.client.order.findUniqueOrThrow({ where: { reference } });
    expect(order.status).toBe('PAID');
  });

  it('rejects an unsigned or wrongly signed webhook', async () => {
    const { reference, totalMinor } = await placeOrder();
    const providerReference = (
      await api().post(`/api/v1/orders/${reference}/payment`).expect(HttpStatus.OK)
    ).body.data.reference as string;
    const { body } = signedWebhook(providerReference, 'SUCCEEDED', totalMinor);

    await postWebhook(body, undefined).expect(HttpStatus.BAD_REQUEST);
    await postWebhook(body, 'deadbeef').expect(HttpStatus.BAD_REQUEST);
    // The order was untouched by the rejected webhooks.
    const order = await database.client.order.findUniqueOrThrow({ where: { reference } });
    expect(order.status).toBe('PAYMENT_PROCESSING');
  });

  it('rejects a signed webhook whose amount does not match the payment', async () => {
    const { reference, totalMinor } = await placeOrder();
    const providerReference = (
      await api().post(`/api/v1/orders/${reference}/payment`).expect(HttpStatus.OK)
    ).body.data.reference as string;
    const { body, signature } = signedWebhook(providerReference, 'SUCCEEDED', totalMinor + 1);
    const rejected = await postWebhook(body, signature).expect(HttpStatus.BAD_REQUEST);
    expect(rejected.body.error.code).toBe('VALIDATION_FAILED');
    const order = await database.client.order.findUniqueOrThrow({ where: { reference } });
    expect(order.status).toBe('PAYMENT_PROCESSING');
  });

  it('reconciles against the provider when a webhook is missed', async () => {
    const { reference } = await placeOrder();
    await api().post(`/api/v1/orders/${reference}/payment`).expect(HttpStatus.OK);

    // No webhook arrives; the client (or a sweep) reconciles instead.
    const reconciled = await api()
      .post(`/api/v1/orders/${reference}/payment/verify`)
      .expect(HttpStatus.OK);
    expect(reconciled.body.data.status).toBe('SUCCEEDED');
    const order = await database.client.order.findUniqueOrThrow({ where: { reference } });
    expect(order.status).toBe('PAID');
  });

  it('fails the order and releases the hold on a failed payment', async () => {
    const { reference, totalMinor } = await placeOrder('decline@example.com');
    const providerReference = (
      await api().post(`/api/v1/orders/${reference}/payment`).expect(HttpStatus.OK)
    ).body.data.reference as string;

    const { body, signature } = signedWebhook(providerReference, 'FAILED', totalMinor);
    await postWebhook(body, signature).expect(HttpStatus.OK);

    const order = await database.client.order.findUniqueOrThrow({ where: { reference } });
    expect(order.status).toBe('PAYMENT_FAILED');
    const reservations = await database.client.inventoryReservation.findMany({
      where: { reference: `order:${order.id}` },
    });
    expect(reservations.every((reservation) => reservation.status === 'RELEASED')).toBe(true);
  });

  it('refuses to initiate payment on an order that is not awaiting payment', async () => {
    const { reference, totalMinor } = await placeOrder();
    const providerReference = (
      await api().post(`/api/v1/orders/${reference}/payment`).expect(HttpStatus.OK)
    ).body.data.reference as string;
    const { body, signature } = signedWebhook(providerReference, 'SUCCEEDED', totalMinor);
    await postWebhook(body, signature).expect(HttpStatus.OK);

    // The order is paid; a fresh initiation is a conflict.
    const conflict = await api()
      .post(`/api/v1/orders/${reference}/payment`)
      .expect(HttpStatus.CONFLICT);
    expect(conflict.body.error.code).toBe('CONFLICT');
    // An unknown reference is not found.
    await api().post('/api/v1/orders/TMS-DEADBEEF00/payment').expect(HttpStatus.NOT_FOUND);
  });

  it('refunds a paid order fully and partially through the state machine', async () => {
    // Full refund.
    const full = await placeOrder();
    const fullRef = (
      await api().post(`/api/v1/orders/${full.reference}/payment`).expect(HttpStatus.OK)
    ).body.data.reference as string;
    const fullWebhook = signedWebhook(fullRef, 'SUCCEEDED', full.totalMinor);
    await postWebhook(fullWebhook.body, fullWebhook.signature).expect(HttpStatus.OK);
    const refunded = await payments.refund(full.reference, full.totalMinor, 'test');
    expect(refunded.status).toBe('REFUNDED');
    expect(
      (await database.client.order.findUniqueOrThrow({ where: { reference: full.reference } }))
        .status,
    ).toBe('REFUNDED');

    // Partial refund on a different order.
    const partial = await placeOrder();
    const partialRef = (
      await api().post(`/api/v1/orders/${partial.reference}/payment`).expect(HttpStatus.OK)
    ).body.data.reference as string;
    const webhook = signedWebhook(partialRef, 'SUCCEEDED', partial.totalMinor);
    await postWebhook(webhook.body, webhook.signature).expect(HttpStatus.OK);
    const partiallyRefunded = await payments.refund(partial.reference, 1_000, 'test');
    expect(partiallyRefunded.status).toBe('PARTIALLY_REFUNDED');
    expect(
      (await database.client.order.findUniqueOrThrow({ where: { reference: partial.reference } }))
        .status,
    ).toBe('PARTIALLY_REFUNDED');
  });
});
