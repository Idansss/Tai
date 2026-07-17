import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import type { PaymentStatus } from '@tms/contracts';

import type {
  CreatePaymentInput,
  PaymentInitiation,
  PaymentProvider,
  PaymentVerification,
  ProviderHealth,
  ProviderWebhookEvent,
  RefundInput,
  RefundResult,
} from './payment-provider.js';

interface MockIntent {
  amountMinor: number;
  currency: string;
  outcome: 'SUCCEEDED' | 'FAILED';
}

/**
 * A complete, deterministic payment gateway for development and tests. It settles no money: it
 * decides an outcome at creation and reports it consistently through verification and the webhook
 * it signs. Signature verification is real HMAC-SHA256, so the webhook and reconciliation paths
 * are exercised exactly as a real gateway would drive them.
 *
 * Outcome rule: a payment succeeds unless the customer email begins with `decline`, which lets a
 * test drive the failure branch without special endpoints.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';
  private readonly intents = new Map<string, MockIntent>();

  constructor(
    private readonly webhookSecret: string,
    private readonly appPublicUrl: string,
  ) {}

  async createPayment(input: CreatePaymentInput): Promise<PaymentInitiation> {
    const providerReference = `mock_${randomUUID()}`;
    const outcome = input.customerEmail.trim().toLowerCase().startsWith('decline')
      ? 'FAILED'
      : 'SUCCEEDED';
    this.intents.set(providerReference, {
      amountMinor: input.amountMinor,
      currency: input.currency,
      outcome,
    });
    return {
      providerReference,
      redirectUrl: `${this.appPublicUrl}/checkout/mock/${providerReference}`,
      status: 'PENDING',
    };
  }

  async verify(providerReference: string): Promise<PaymentVerification> {
    const intent = this.intents.get(providerReference);
    if (!intent) {
      return { providerReference, status: 'PENDING', amountMinor: 0, currency: 'NGN' };
    }
    return {
      providerReference,
      status: intent.outcome,
      amountMinor: intent.amountMinor,
      currency: intent.currency,
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
    if (!signature) return false;
    const expected = this.sign(rawBody);
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const providedBuffer = Buffer.from(signature, 'utf8');
    if (expectedBuffer.length !== providedBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, providedBuffer);
  }

  parseWebhook(rawBody: string): ProviderWebhookEvent {
    const parsed = JSON.parse(rawBody) as {
      id?: unknown;
      type?: unknown;
      data?: {
        reference?: unknown;
        status?: unknown;
        amountMinor?: unknown;
        currency?: unknown;
      };
    };
    const data = parsed.data ?? {};
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.type !== 'string' ||
      typeof data.reference !== 'string' ||
      typeof data.status !== 'string' ||
      typeof data.amountMinor !== 'number' ||
      typeof data.currency !== 'string'
    ) {
      throw new Error('Malformed mock webhook payload.');
    }
    return {
      eventId: parsed.id,
      type: parsed.type,
      providerReference: data.reference,
      status: data.status as PaymentStatus,
      amountMinor: data.amountMinor,
      currency: data.currency,
      payload: parsed,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const intent = this.intents.get(input.providerReference);
    const original = intent?.amountMinor ?? input.amountMinor;
    const status: PaymentStatus = input.amountMinor >= original ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    return {
      providerReference: input.providerReference,
      refundReference: `mock_rf_${randomUUID()}`,
      amountMinor: input.amountMinor,
      status,
    };
  }

  async health(): Promise<ProviderHealth> {
    return { provider: this.name, status: 'healthy', checkedAt: new Date().toISOString() };
  }

  /** The HMAC a webhook must carry. Exposed so the dev/test harness can sign a simulated event. */
  sign(rawBody: string): string {
    return createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
  }
}
