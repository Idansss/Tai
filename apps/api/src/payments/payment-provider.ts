import type { PaymentStatus } from '@tms/contracts';

/** Provider health, mirroring `@tms/integrations` without taking a dependency on it yet. */
export interface ProviderHealth {
  provider: string;
  status: 'healthy' | 'degraded' | 'unavailable' | 'unconfigured';
  checkedAt: string;
}

/**
 * The provider-neutral payment port (ADR-004). A concrete gateway — the mock here, Flutterwave in
 * TMS-B5-002 — implements this and nothing else in the domain depends on the gateway directly.
 * Money is always integer minor units.
 */

export interface CreatePaymentInput {
  orderReference: string;
  amountMinor: number;
  currency: string;
  customerEmail: string;
  correlationId: string;
}

export interface PaymentInitiation {
  providerReference: string;
  /** A provider-hosted URL to send the browser to, when the provider needs one. */
  redirectUrl: string | null;
  status: PaymentStatus;
}

export interface PaymentVerification {
  providerReference: string;
  status: PaymentStatus;
  amountMinor: number;
  currency: string;
}

/** A normalized provider event, parsed from a webhook or a verification pull. */
export interface ProviderWebhookEvent {
  /** The provider's own event id; used to make replayed webhooks idempotent. */
  eventId: string;
  type: string;
  providerReference: string;
  status: PaymentStatus;
  amountMinor: number;
  currency: string;
  payload: unknown;
}

export interface RefundInput {
  providerReference: string;
  amountMinor: number;
  correlationId: string;
}

export interface RefundResult {
  providerReference: string;
  refundReference: string;
  amountMinor: number;
  status: PaymentStatus;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<PaymentInitiation>;
  verify(providerReference: string): Promise<PaymentVerification>;
  /** Verifies the raw body against the signature header. Never trust an unsigned webhook. */
  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean;
  parseWebhook(rawBody: string): ProviderWebhookEvent;
  refund(input: RefundInput): Promise<RefundResult>;
  health(): Promise<ProviderHealth>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
export const PAYMENT_CONFIG = Symbol('PAYMENT_CONFIG');

export interface PaymentConfig {
  provider: string;
  mockWebhookSecret: string;
  appPublicUrl: string;
}
