import { randomUUID, timingSafeEqual } from 'node:crypto';

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

/** The subset of `fetch` the adapter uses, so a test can inject a fake without a network. */
export type FetchFn = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export interface FlutterwaveConfig {
  baseUrl: string;
  secretKey: string;
  webhookHash: string;
  appPublicUrl: string;
}

interface FlutterwaveTransaction {
  id?: number;
  tx_ref?: string;
  status?: string;
  amount?: number;
  currency?: string;
}

/**
 * The Flutterwave adapter behind the provider-neutral port (ADR-004/019). It is complete and
 * config-validated; only live credential verification is Blocked, since no sandbox keys are
 * present. Flutterwave settles in **major** currency units (naira), while the platform is integer
 * **minor** units (kobo) everywhere else, so this adapter is the one place that converts: it
 * divides by 100 on the way out and multiplies by 100 on the way in.
 *
 * Webhook authentication is Flutterwave's scheme: a static `verif-hash` header equal to the
 * configured secret hash, compared in constant time. The transaction reference we generate
 * (`tx_ref`) is the provider reference; the numeric transaction id is resolved from Flutterwave
 * when a refund needs it.
 */
export class FlutterwavePaymentProvider implements PaymentProvider {
  readonly name = 'flutterwave';

  constructor(
    private readonly config: FlutterwaveConfig,
    private readonly fetchFn: FetchFn = globalThis.fetch as unknown as FetchFn,
  ) {}

  async createPayment(input: CreatePaymentInput): Promise<PaymentInitiation> {
    const txRef = `flw_${randomUUID()}`;
    const response = await this.request('POST', '/payments', {
      tx_ref: txRef,
      amount: this.toMajor(input.amountMinor),
      currency: input.currency,
      redirect_url: `${this.config.appPublicUrl}/checkout/return`,
      customer: { email: input.customerEmail },
      meta: { orderReference: input.orderReference, correlationId: input.correlationId },
    });
    const data = (response as { data?: { link?: string } }).data;
    return { providerReference: txRef, redirectUrl: data?.link ?? null, status: 'PENDING' };
  }

  async verify(providerReference: string): Promise<PaymentVerification> {
    const transaction = await this.verifyByReference(providerReference);
    return {
      providerReference,
      status: this.mapStatus(transaction.status),
      amountMinor: this.toMinor(transaction.amount ?? 0),
      currency: transaction.currency ?? 'NGN',
    };
  }

  verifyWebhookSignature(_rawBody: string, signature: string | undefined): boolean {
    if (!signature) return false;
    const expected = Buffer.from(this.config.webhookHash, 'utf8');
    const provided = Buffer.from(signature, 'utf8');
    if (expected.length !== provided.length) return false;
    return timingSafeEqual(expected, provided);
  }

  parseWebhook(rawBody: string): ProviderWebhookEvent {
    const parsed = JSON.parse(rawBody) as { event?: unknown; data?: FlutterwaveTransaction };
    const data = parsed.data ?? {};
    if (
      typeof parsed.event !== 'string' ||
      typeof data.tx_ref !== 'string' ||
      typeof data.status !== 'string' ||
      typeof data.amount !== 'number' ||
      typeof data.currency !== 'string' ||
      typeof data.id !== 'number'
    ) {
      throw new Error('Malformed Flutterwave webhook payload.');
    }
    return {
      // The transaction id is stable across redeliveries, so it deduplicates a replayed webhook.
      eventId: String(data.id),
      type: parsed.event,
      providerReference: data.tx_ref,
      status: this.mapStatus(data.status),
      amountMinor: this.toMinor(data.amount),
      currency: data.currency,
      payload: parsed,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    // Flutterwave refunds by numeric transaction id, which we resolve from the reference first.
    const transaction = await this.verifyByReference(input.providerReference);
    if (typeof transaction.id !== 'number') {
      throw new Error('Cannot refund a Flutterwave transaction without its id.');
    }
    const response = await this.request('POST', `/transactions/${transaction.id}/refund`, {
      amount: this.toMajor(input.amountMinor),
    });
    const data = (response as { data?: { id?: number } }).data;
    const charged = this.toMinor(transaction.amount ?? 0);
    const status: PaymentStatus = input.amountMinor >= charged ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    return {
      providerReference: input.providerReference,
      refundReference: data?.id ? `flw_rf_${data.id}` : `flw_rf_${randomUUID()}`,
      amountMinor: input.amountMinor,
      status,
    };
  }

  async health(): Promise<ProviderHealth> {
    const configured = Boolean(this.config.secretKey && this.config.webhookHash);
    return {
      provider: this.name,
      status: configured ? 'healthy' : 'unconfigured',
      checkedAt: new Date().toISOString(),
    };
  }

  private async verifyByReference(txRef: string): Promise<FlutterwaveTransaction> {
    const response = await this.request(
      'GET',
      `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
    );
    return (response as { data?: FlutterwaveTransaction }).data ?? {};
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const response = await this.fetchFn(`${this.config.baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${this.config.secretKey}`,
        'content-type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok || (json as { status?: string }).status === 'error') {
      const message = (json as { message?: string }).message ?? `HTTP ${response.status}`;
      throw new Error(`Flutterwave request failed: ${message}`);
    }
    return json;
  }

  private mapStatus(status: string | undefined): PaymentStatus {
    switch ((status ?? '').toLowerCase()) {
      case 'successful':
      case 'success':
        return 'SUCCEEDED';
      case 'failed':
        return 'FAILED';
      case 'cancelled':
        return 'CANCELLED';
      default:
        return 'PENDING';
    }
  }

  /** Minor units (kobo) to Flutterwave's major units (naira). */
  private toMajor(amountMinor: number): number {
    return amountMinor / 100;
  }

  /** Flutterwave's major units (naira) back to integer minor units (kobo). */
  private toMinor(amountMajor: number): number {
    return Math.round(amountMajor * 100);
  }
}
