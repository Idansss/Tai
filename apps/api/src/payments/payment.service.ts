import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { ErrorCode, OrderPaymentHandoff } from '@tms/contracts';
import { OrderStatus, PaymentStatus, Prisma } from '@tms/database';

import { DatabaseService } from '../database/database.service.js';
import { OrderService } from '../orders/order.service.js';
import { ApiProblemException } from '../platform/api-problem.exception.js';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider.js';

type PaymentRecord = Prisma.PaymentGetPayload<Record<string, never>>;

@Injectable()
export class PaymentService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    @Inject(OrderService) private readonly orders: OrderService,
  ) {}

  /**
   * Starts a payment for an order awaiting payment. Reusing an existing pending attempt keeps this
   * idempotent, so a customer who reloads the payment page does not spawn a second intent. The
   * order moves into PAYMENT_PROCESSING through the audited state machine.
   */
  async initiate(orderReference: string, correlationId: string): Promise<OrderPaymentHandoff> {
    const order = await this.orderRow(orderReference);
    if (
      order.status !== OrderStatus.AWAITING_PAYMENT &&
      order.status !== OrderStatus.PAYMENT_PROCESSING
    ) {
      throw this.problem('CONFLICT', HttpStatus.CONFLICT, 'This order is not awaiting payment.');
    }

    const existing = await this.database.client.payment.findFirst({
      where: {
        orderId: order.id,
        status: { in: [PaymentStatus.CREATED, PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return this.handoff(existing);

    const initiation = await this.provider.createPayment({
      orderReference,
      amountMinor: order.totalMinor,
      currency: order.currency,
      customerEmail: order.contactEmail,
      correlationId,
    });
    const payment = await this.database.client.payment.create({
      data: {
        orderId: order.id,
        provider: this.provider.name,
        providerReference: initiation.providerReference,
        status: PaymentStatus.PENDING,
        amountMinor: order.totalMinor,
        currency: order.currency,
        redirectUrl: initiation.redirectUrl,
      },
    });
    await this.recordEvent(
      payment.id,
      `init_${payment.id}`,
      'payment.created',
      PaymentStatus.PENDING,
      order.totalMinor,
    );
    if (order.status === OrderStatus.AWAITING_PAYMENT) {
      await this.orders.beginPayment(order.id, {
        correlationId,
        actorType: 'SYSTEM',
        reason: 'Payment initiated.',
      });
    }
    return this.handoff(payment, initiation.redirectUrl);
  }

  /**
   * Handles a provider webhook. The signature is verified before anything else; the event is
   * deduplicated by its provider event id so a replay is a no-op; the amount and currency are
   * checked against the payment we created so a mismatched or forged event is rejected; then the
   * outcome is applied to the order through the state machine.
   */
  async handleWebhook(
    providerName: string,
    rawBody: string,
    signature: string | undefined,
    correlationId: string,
  ): Promise<{ received: true }> {
    if (providerName !== this.provider.name) throw this.notFound();
    if (!this.provider.verifyWebhookSignature(rawBody, signature)) {
      throw this.problem('VALIDATION_FAILED', HttpStatus.BAD_REQUEST, 'Invalid webhook signature.');
    }
    let event;
    try {
      event = this.provider.parseWebhook(rawBody);
    } catch {
      throw this.problem('VALIDATION_FAILED', HttpStatus.BAD_REQUEST, 'Malformed webhook payload.');
    }

    const payment = await this.database.client.payment.findUnique({
      where: { providerReference: event.providerReference },
    });
    // Acknowledge an unknown reference without disclosing whether it exists.
    if (!payment) return { received: true };
    if (event.amountMinor !== payment.amountMinor || event.currency !== payment.currency) {
      throw this.problem(
        'VALIDATION_FAILED',
        HttpStatus.BAD_REQUEST,
        'Webhook amount or currency does not match the payment.',
      );
    }

    try {
      await this.database.client.paymentEvent.create({
        data: {
          paymentId: payment.id,
          provider: this.provider.name,
          providerEventId: event.eventId,
          type: event.type,
          status: event.status,
          amountMinor: event.amountMinor,
          payload: event.payload as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      // A replayed webhook carries the same event id and is a no-op.
      if (this.isUniqueViolation(error)) return { received: true };
      throw error;
    }

    await this.applyOutcome(payment, event.status, correlationId);
    return { received: true };
  }

  /**
   * Reconciles an order's latest payment against the provider's own record. This is the fallback
   * when a webhook is lost: the pulled status is applied through the same idempotent path.
   */
  async reconcile(orderReference: string, correlationId: string): Promise<OrderPaymentHandoff> {
    const order = await this.orderRow(orderReference);
    const payment = await this.latestPayment(order.id);
    if (!payment) {
      throw this.problem(
        'CONFLICT',
        HttpStatus.CONFLICT,
        'No payment has been initiated for this order.',
      );
    }
    const verification = await this.provider.verify(payment.providerReference);
    if (verification.status !== payment.status) {
      try {
        await this.database.client.paymentEvent.create({
          data: {
            paymentId: payment.id,
            provider: this.provider.name,
            providerEventId: `verify_${payment.id}_${verification.status}`,
            type: 'payment.verify',
            status: verification.status,
            amountMinor: verification.amountMinor,
            payload: {} as Prisma.InputJsonValue,
          },
        });
        await this.applyOutcome(payment, verification.status, correlationId);
      } catch (error) {
        if (!this.isUniqueViolation(error)) throw error;
      }
    }
    return this.handoff(
      await this.database.client.payment.findUniqueOrThrow({ where: { id: payment.id } }),
    );
  }

  async getForOrder(orderReference: string): Promise<OrderPaymentHandoff> {
    const order = await this.orderRow(orderReference);
    const payment = await this.latestPayment(order.id);
    if (!payment) {
      return { status: 'PENDING', provider: null, reference: null, redirectUrl: null };
    }
    return this.handoff(payment);
  }

  /**
   * Refunds a settled payment fully or partially and advances the order through REFUND_PENDING to
   * REFUNDED or PARTIALLY_REFUNDED. Service-level in this task; the administrator refund endpoint
   * lands with the B6 operations surface. A refund can never exceed the refundable balance.
   */
  async refund(
    orderReference: string,
    amountMinor: number,
    correlationId: string,
  ): Promise<OrderPaymentHandoff> {
    const order = await this.orderRow(orderReference);
    if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.PARTIALLY_REFUNDED) {
      throw this.problem('CONFLICT', HttpStatus.CONFLICT, 'Only a paid order can be refunded.');
    }
    const payment = await this.database.client.payment.findFirst({
      where: {
        orderId: order.id,
        status: { in: [PaymentStatus.SUCCEEDED, PaymentStatus.PARTIALLY_REFUNDED] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment) {
      throw this.problem('CONFLICT', HttpStatus.CONFLICT, 'No settled payment to refund.');
    }
    const refundable = payment.amountMinor - payment.refundedMinor;
    if (amountMinor <= 0 || amountMinor > refundable) {
      throw this.problem(
        'VALIDATION_FAILED',
        HttpStatus.BAD_REQUEST,
        'Refund amount exceeds the refundable balance.',
      );
    }

    const result = await this.provider.refund({
      providerReference: payment.providerReference,
      amountMinor,
      correlationId,
    });
    const refundedTotal = payment.refundedMinor + amountMinor;
    const paymentStatus =
      refundedTotal >= payment.amountMinor
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;
    await this.database.client.payment.update({
      where: { id: payment.id },
      data: { refundedMinor: refundedTotal, status: paymentStatus },
    });
    await this.recordEvent(
      payment.id,
      result.refundReference,
      'payment.refund',
      paymentStatus,
      amountMinor,
    );

    const ctx = { correlationId, actorType: 'SYSTEM' as const, reason: 'Refund issued.' };
    if (order.status === OrderStatus.PAID) {
      await this.orders.transition(order.id, OrderStatus.REFUND_PENDING, ctx);
    }
    const target =
      paymentStatus === PaymentStatus.REFUNDED
        ? OrderStatus.REFUNDED
        : OrderStatus.PARTIALLY_REFUNDED;
    const current = (await this.orderRow(orderReference)).status;
    if (current !== target) await this.orders.transition(order.id, target, ctx);
    return this.handoff(
      await this.database.client.payment.findUniqueOrThrow({ where: { id: payment.id } }),
    );
  }

  // --- Helpers -------------------------------------------------------------

  private async applyOutcome(
    payment: PaymentRecord,
    status: PaymentStatus,
    correlationId: string,
  ): Promise<void> {
    // A payment already settled or refunded ignores a late duplicate outcome.
    if (
      payment.status === PaymentStatus.SUCCEEDED ||
      payment.status === PaymentStatus.REFUNDED ||
      payment.status === PaymentStatus.PARTIALLY_REFUNDED ||
      payment.status === PaymentStatus.REVERSED
    ) {
      return;
    }
    if (status === PaymentStatus.SUCCEEDED) {
      try {
        await this.orders.confirmPayment(payment.orderId, {
          correlationId,
          actorType: 'SYSTEM',
          reason: 'Payment succeeded.',
        });
        await this.setStatus(payment.id, PaymentStatus.SUCCEEDED);
      } catch (error) {
        // The stock reserved for the order expired underneath a successful charge. Fail the order
        // and mark the payment reversed; a real gateway would be refunded here (TMS-B5-002).
        if (error instanceof ApiProblemException && error.code === 'INVENTORY_UNAVAILABLE') {
          await this.orders.failPayment(payment.orderId, {
            correlationId,
            actorType: 'SYSTEM',
            reason: 'Stock expired after payment; reversing.',
          });
          await this.setStatus(payment.id, PaymentStatus.REVERSED);
          return;
        }
        throw error;
      }
    } else if (status === PaymentStatus.FAILED || status === PaymentStatus.CANCELLED) {
      await this.orders.failPayment(payment.orderId, {
        correlationId,
        actorType: 'SYSTEM',
        reason: 'Payment failed.',
      });
      await this.setStatus(payment.id, status);
    }
  }

  private async orderRow(reference: string) {
    const order = await this.database.client.order.findUnique({ where: { reference } });
    if (!order) throw this.notFound();
    return order;
  }

  private latestPayment(orderId: string): Promise<PaymentRecord | null> {
    return this.database.client.payment.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async setStatus(paymentId: string, status: PaymentStatus): Promise<void> {
    await this.database.client.payment.update({ where: { id: paymentId }, data: { status } });
  }

  private async recordEvent(
    paymentId: string,
    providerEventId: string,
    type: string,
    status: PaymentStatus,
    amountMinor: number,
  ): Promise<void> {
    await this.database.client.paymentEvent.create({
      data: {
        paymentId,
        provider: this.provider.name,
        providerEventId,
        type,
        status,
        amountMinor,
        payload: {} as Prisma.InputJsonValue,
      },
    });
  }

  private handoff(payment: PaymentRecord, redirectUrl?: string | null): OrderPaymentHandoff {
    return {
      status: payment.status,
      provider: payment.provider,
      reference: payment.providerReference,
      redirectUrl: redirectUrl ?? payment.redirectUrl ?? null,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private notFound(): ApiProblemException {
    return new ApiProblemException('RESOURCE_NOT_FOUND', HttpStatus.NOT_FOUND, 'Order not found.');
  }

  private problem(code: ErrorCode, status: HttpStatus, message: string): ApiProblemException {
    return new ApiProblemException(code, status, message);
  }
}
