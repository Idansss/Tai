import { describe, expect, it } from 'vitest';

import { MockPaymentProvider } from './mock-payment-provider.js';

const provider = new MockPaymentProvider(
  'mock-webhook-secret-at-least-16',
  'http://localhost:3000',
);

async function create(email: string) {
  return provider.createPayment({
    orderReference: 'TMS-ABCDEF0123',
    amountMinor: 3_160_000,
    currency: 'NGN',
    customerEmail: email,
    correlationId: 'test',
  });
}

describe('MockPaymentProvider', () => {
  it('creates a pending payment with a redirect and reports the intended outcome', async () => {
    const initiation = await create('shopper@example.com');
    expect(initiation.providerReference).toMatch(/^mock_/);
    expect(initiation.status).toBe('PENDING');
    expect(initiation.redirectUrl).toContain(initiation.providerReference);

    const verification = await provider.verify(initiation.providerReference);
    expect(verification).toMatchObject({
      status: 'SUCCEEDED',
      amountMinor: 3_160_000,
      currency: 'NGN',
    });
  });

  it('drives the failure branch for a declining customer', async () => {
    const initiation = await create('decline@example.com');
    expect((await provider.verify(initiation.providerReference)).status).toBe('FAILED');
  });

  it('verifies its own HMAC signature and rejects a wrong or missing one', () => {
    const body = JSON.stringify({ id: 'evt_1', type: 'payment.succeeded' });
    const signature = provider.sign(body);
    expect(provider.verifyWebhookSignature(body, signature)).toBe(true);
    expect(provider.verifyWebhookSignature(body, 'deadbeef')).toBe(false);
    expect(provider.verifyWebhookSignature(body, undefined)).toBe(false);
    expect(provider.verifyWebhookSignature(`${body} `, signature)).toBe(false);
  });

  it('parses a well-formed webhook and rejects a malformed one', () => {
    const body = JSON.stringify({
      id: 'evt_2',
      type: 'payment.succeeded',
      data: { reference: 'mock_1', status: 'SUCCEEDED', amountMinor: 100, currency: 'NGN' },
    });
    expect(provider.parseWebhook(body)).toMatchObject({
      eventId: 'evt_2',
      providerReference: 'mock_1',
      status: 'SUCCEEDED',
      amountMinor: 100,
    });
    expect(() => provider.parseWebhook('{"id":"x"}')).toThrow();
  });

  it('reports a full versus partial refund', async () => {
    const initiation = await create('shopper@example.com');
    const full = await provider.refund({
      providerReference: initiation.providerReference,
      amountMinor: 3_160_000,
      correlationId: 'test',
    });
    expect(full.status).toBe('REFUNDED');
    const partial = await provider.refund({
      providerReference: initiation.providerReference,
      amountMinor: 1_000_000,
      correlationId: 'test',
    });
    expect(partial.status).toBe('PARTIALLY_REFUNDED');
  });
});
