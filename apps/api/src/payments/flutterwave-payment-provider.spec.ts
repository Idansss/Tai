import { describe, expect, it } from 'vitest';

import { FlutterwavePaymentProvider, type FetchFn } from './flutterwave-payment-provider.js';

const config = {
  baseUrl: 'https://api.flutterwave.test/v3',
  secretKey: 'FLWSECK_TEST-secret',
  webhookHash: 'the-configured-verif-hash',
  appPublicUrl: 'https://shop.example.com',
};

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}

/** A recording fake `fetch` that replies from a queue of JSON bodies. */
function fakeFetch(responses: unknown[]): { fetch: FetchFn; calls: Call[] } {
  const calls: Call[] = [];
  const queue = [...responses];
  const fetch: FetchFn = async (url, init) => {
    calls.push({
      url,
      method: init.method,
      headers: init.headers,
      body: init.body ? JSON.parse(init.body) : undefined,
    });
    const json = queue.shift() ?? {};
    return { ok: true, status: 200, json: async () => json };
  };
  return { fetch, calls };
}

describe('FlutterwavePaymentProvider', () => {
  it('creates a payment in major units and returns the hosted link', async () => {
    const { fetch, calls } = fakeFetch([
      { status: 'success', data: { link: 'https://checkout.flutterwave.test/pay/abc' } },
    ]);
    const provider = new FlutterwavePaymentProvider(config, fetch);
    const initiation = await provider.createPayment({
      orderReference: 'TMS-ABCDEF0123',
      amountMinor: 1_655_000,
      currency: 'NGN',
      customerEmail: 'shopper@example.com',
      correlationId: 'corr-1',
    });

    expect(initiation.status).toBe('PENDING');
    expect(initiation.providerReference).toMatch(/^flw_/);
    expect(initiation.redirectUrl).toBe('https://checkout.flutterwave.test/pay/abc');
    // Flutterwave settles in naira: 1,655,000 kobo becomes 16,550.
    expect(calls[0]!.method).toBe('POST');
    expect(calls[0]!.url).toBe(`${config.baseUrl}/payments`);
    expect(calls[0]!.headers.authorization).toBe(`Bearer ${config.secretKey}`);
    expect(calls[0]!.body).toMatchObject({
      amount: 16_550,
      currency: 'NGN',
      tx_ref: initiation.providerReference,
    });
  });

  it('verifies by reference and converts the amount back to minor units', async () => {
    const { fetch, calls } = fakeFetch([
      {
        status: 'success',
        data: { id: 99, tx_ref: 'flw_1', status: 'successful', amount: 16_550, currency: 'NGN' },
      },
    ]);
    const provider = new FlutterwavePaymentProvider(config, fetch);
    const verification = await provider.verify('flw_1');
    expect(verification).toMatchObject({
      status: 'SUCCEEDED',
      amountMinor: 1_655_000,
      currency: 'NGN',
    });
    expect(calls[0]!.url).toContain('/transactions/verify_by_reference?tx_ref=flw_1');
  });

  it('accepts only the exact verif-hash header', () => {
    const provider = new FlutterwavePaymentProvider(config, fakeFetch([]).fetch);
    expect(provider.verifyWebhookSignature('{}', config.webhookHash)).toBe(true);
    expect(provider.verifyWebhookSignature('{}', 'wrong-hash')).toBe(false);
    expect(provider.verifyWebhookSignature('{}', undefined)).toBe(false);
  });

  it('parses a webhook, deduplicating on the transaction id, and normalises the amount', () => {
    const provider = new FlutterwavePaymentProvider(config, fakeFetch([]).fetch);
    const body = JSON.stringify({
      event: 'charge.completed',
      data: { id: 12345, tx_ref: 'flw_1', status: 'successful', amount: 16_550, currency: 'NGN' },
    });
    expect(provider.parseWebhook(body)).toMatchObject({
      eventId: '12345',
      type: 'charge.completed',
      providerReference: 'flw_1',
      status: 'SUCCEEDED',
      amountMinor: 1_655_000,
      currency: 'NGN',
    });
    expect(() => provider.parseWebhook('{"event":"charge.completed"}')).toThrow();
  });

  it('resolves the transaction id then refunds in major units', async () => {
    const { fetch, calls } = fakeFetch([
      {
        status: 'success',
        data: { id: 777, tx_ref: 'flw_1', status: 'successful', amount: 16_550, currency: 'NGN' },
      },
      { status: 'success', data: { id: 90001 } },
    ]);
    const provider = new FlutterwavePaymentProvider(config, fetch);
    const full = await provider.refund({
      providerReference: 'flw_1',
      amountMinor: 1_655_000,
      correlationId: 'c',
    });
    expect(full.status).toBe('REFUNDED');
    expect(calls[1]!.url).toBe(`${config.baseUrl}/transactions/777/refund`);
    expect(calls[1]!.body).toMatchObject({ amount: 16_550 });

    const { fetch: fetch2 } = fakeFetch([
      {
        status: 'success',
        data: { id: 778, tx_ref: 'flw_2', status: 'successful', amount: 16_550, currency: 'NGN' },
      },
      { status: 'success', data: { id: 90002 } },
    ]);
    const partial = await new FlutterwavePaymentProvider(config, fetch2).refund({
      providerReference: 'flw_2',
      amountMinor: 500_000,
      correlationId: 'c',
    });
    expect(partial.status).toBe('PARTIALLY_REFUNDED');
  });

  it('raises when the gateway returns an error envelope', async () => {
    const { fetch } = fakeFetch([{ status: 'error', message: 'No transaction found' }]);
    const provider = new FlutterwavePaymentProvider(config, fetch);
    await expect(provider.verify('flw_missing')).rejects.toThrow('Flutterwave request failed');
  });

  it('reports unconfigured health without credentials', async () => {
    const provider = new FlutterwavePaymentProvider(
      { ...config, secretKey: '', webhookHash: '' },
      fakeFetch([]).fetch,
    );
    expect((await provider.health()).status).toBe('unconfigured');
  });
});
