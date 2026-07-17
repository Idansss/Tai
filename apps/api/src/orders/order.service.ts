import { randomBytes, randomUUID } from 'node:crypto';

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type {
  AppliedPromotion,
  Cart as CartContract,
  CheckoutQuote,
  DeliveryOption,
  Money,
  Order as OrderContract,
  OrderItem as OrderItemContract,
  OrderPaymentHandoff,
  OrderSummary,
  OrderTimelineEntry,
  PaymentStatus,
} from '@tms/contracts';
import { OrderStatus, Prisma, type DeliveryMethod as DeliveryMethodId } from '@tms/database';

import { normalizeEmail } from '../auth/auth-crypto.js';
import type { AuthenticatedSession } from '../auth/auth.types.js';
import { CartService, type CartOwner } from '../cart/cart.service.js';
import { DatabaseService } from '../database/database.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { ApiProblemException } from '../platform/api-problem.exception.js';
import {
  deliveryMethodOf,
  deliveryOptionsFor,
  resolveDeliveryOption,
  taxMinorOf,
} from './delivery.js';
import type { CheckoutQuoteDto, PlaceOrderDto } from './order.dto.js';
import { canTransition } from './order-state-machine.js';

/** The base currency. Every priced pair settles in NGN today (ADR-015). */
const FALLBACK_CURRENCY = 'NGN';
/** The inventory hold taken at checkout expires quickly so an abandoned checkout frees stock. */
const RESERVATION_TTL_SECONDS = 15 * 60;

const withDetail = {
  items: { orderBy: { createdAt: 'asc' } },
  events: { orderBy: { createdAt: 'asc' } },
} as const;

type OrderRecord = Prisma.OrderGetPayload<{ include: typeof withDetail }>;

export interface OrderStateContext {
  correlationId: string;
  reason?: string;
  actorType?: 'USER' | 'SYSTEM' | 'INTEGRATION';
  actorUserId?: string | null;
}

@Injectable()
export class OrderService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(CartService) private readonly cart: CartService,
    @Inject(InventoryService) private readonly inventory: InventoryService,
  ) {}

  // --- Checkout ------------------------------------------------------------

  deliveryOptions(state: string): DeliveryOption[] {
    return deliveryOptionsFor(state, FALLBACK_CURRENCY);
  }

  /** A display quote for the current cart. Placing the order recomputes this authoritatively. */
  async quote(owner: CartOwner, input: CheckoutQuoteDto): Promise<CheckoutQuote> {
    const cart = await this.cart.read(owner);
    this.assertPurchasable(cart);
    return this.computeQuote(cart, input.deliveryMethodId, input.address.state);
  }

  /**
   * Places an order from the caller's cart. The flow is: refuse an empty or issue-carrying cart
   * before anything else; take a short inventory hold per line (ADR-016/017); snapshot every line
   * with copied prices and descriptions (ADR-015); then, in one transaction, write the immutable
   * order and empty the cart. Payment is taken separately (TMS-B5-001); the order begins
   * AWAITING_PAYMENT.
   */
  async place(
    owner: CartOwner,
    input: PlaceOrderDto,
    ctx: { correlationId: string; idempotencyKey: string | null },
  ): Promise<OrderContract> {
    const userId = owner.userId ?? null;
    // Idempotency is keyed per customer and checked first: a retried checkout returns the order it
    // already placed rather than draining stock a second time, even though the first placement
    // already emptied the cart. Guest carts are deduplicated by that emptied cart instead.
    if (userId && ctx.idempotencyKey) {
      const existing = await this.database.client.order.findFirst({
        where: { userId, idempotencyKey: ctx.idempotencyKey },
        include: withDetail,
      });
      if (existing) return this.toContract(existing);
    }

    const cart = await this.cart.read(owner);
    this.assertPurchasable(cart);

    const detail = await this.lineDetail(cart.id);
    const quote = this.computeQuote(cart, input.deliveryMethodId, input.address.state);
    const orderId = randomUUID();
    const reference = this.newReference();

    // Take the holds before writing the order. If a line cannot be held — the last unit went
    // between cart and checkout — release everything already taken and refuse before payment.
    const reservationByLine = new Map<string, string>();
    try {
      for (const item of cart.items) {
        const reservation = await this.inventory.reserve({
          variantId: item.garmentVariantId,
          quantity: item.quantity,
          reference: `order:${orderId}`,
          ttlSeconds: RESERVATION_TTL_SECONDS,
        });
        reservationByLine.set(item.lineId, reservation.id);
      }

      await this.database.client.$transaction(async (tx) => {
        await tx.order.create({
          data: {
            id: orderId,
            reference,
            userId,
            status: OrderStatus.AWAITING_PAYMENT,
            idempotencyKey: userId ? ctx.idempotencyKey : null,
            contactEmail: input.contact.email,
            normalizedEmail: normalizeEmail(input.contact.email),
            contactName: input.contact.name,
            contactPhone: input.contact.phone ?? null,
            addressState: input.address.state,
            addressCity: input.address.city,
            addressLine1: input.address.line1,
            addressLine2: input.address.line2 ?? null,
            addressPostcode: input.address.postcode ?? null,
            deliveryMethod: quote.deliveryMethod.id as DeliveryMethodId,
            currency: quote.currency,
            subtotalMinor: quote.subtotal.amountMinor,
            discountMinor: quote.discount.amountMinor,
            deliveryMinor: quote.delivery.amountMinor,
            taxMinor: quote.tax.amountMinor,
            totalMinor: quote.total.amountMinor,
            promotionCode: quote.promotion?.code ?? null,
            promotionLabel: quote.promotion?.label ?? null,
            items: {
              create: cart.items.map((item) => {
                const row = detail.get(item.lineId);
                if (!row || !item.unitPrice || !item.lineTotal) throw this.cartChanged();
                return {
                  artworkVersionId: item.artworkVersionId,
                  garmentVariantId: item.garmentVariantId,
                  placementId: item.placementId,
                  scalePresetId: item.scalePresetId,
                  view: item.view,
                  configurationHash: row.configurationHash,
                  quantity: item.quantity,
                  unitPriceMinor: item.unitPrice.amountMinor,
                  lineTotalMinor: item.lineTotal.amountMinor,
                  currency: item.unitPrice.currency,
                  artworkTitle: row.artworkVersion.title,
                  garmentTitle: row.garmentVariant.template.title,
                  colourName: row.garmentVariant.colour.name,
                  sizeLabel: row.garmentVariant.size.label,
                  sku: row.garmentVariant.sku,
                  reservationId: reservationByLine.get(item.lineId)!,
                };
              }),
            },
            events: {
              create: {
                fromStatus: null,
                toStatus: OrderStatus.AWAITING_PAYMENT,
                reason: 'Order placed.',
                actorType: userId ? 'USER' : 'SYSTEM',
                actorUserId: userId,
                correlationId: ctx.correlationId,
              },
            },
          },
        });
        // The cart lines are now an immutable order; empty the cart and consume its promotion.
        await tx.cartLine.deleteMany({ where: { cartId: cart.id } });
        await tx.cart.update({ where: { id: cart.id }, data: { promotionId: null } });
      });
    } catch (error) {
      await this.releaseAll([...reservationByLine.values()]);
      // A concurrent submit with the same idempotency key lost the unique race. Return the order
      // the winner placed rather than surfacing a database error.
      if (this.isUniqueViolation(error) && userId && ctx.idempotencyKey) {
        const winner = await this.database.client.order.findFirst({
          where: { userId, idempotencyKey: ctx.idempotencyKey },
          include: withDetail,
        });
        if (winner) return this.toContract(winner);
      }
      throw error;
    }

    return this.getById(orderId);
  }

  // --- Reads ---------------------------------------------------------------

  async listForCustomer(session: AuthenticatedSession): Promise<OrderSummary[]> {
    const orders = await this.database.client.order.findMany({
      where: this.ownershipWhere(session),
      include: { items: { select: { quantity: true } } },
      orderBy: { placedAt: 'desc' },
    });
    return orders.map((order) => ({
      reference: order.reference,
      status: order.status,
      placedAt: order.placedAt.toISOString(),
      itemCount: order.items.reduce((total, item) => total + item.quantity, 0),
      total: { amountMinor: order.totalMinor, currency: order.currency },
      currency: order.currency,
    }));
  }

  async getForCustomer(session: AuthenticatedSession, reference: string): Promise<OrderContract> {
    const order = await this.database.client.order.findFirst({
      where: { reference, ...this.ownershipWhere(session) },
      include: withDetail,
    });
    // Not found rather than forbidden, so another customer's reference cannot be probed.
    if (!order) throw this.notFound();
    return this.toContract(order);
  }

  async getById(orderId: string): Promise<OrderContract> {
    const order = await this.database.client.order.findUniqueOrThrow({
      where: { id: orderId },
      include: withDetail,
    });
    return this.toContract(order);
  }

  async getByReference(reference: string): Promise<OrderContract> {
    const order = await this.database.client.order.findUnique({
      where: { reference },
      include: withDetail,
    });
    if (!order) throw this.notFound();
    return this.toContract(order);
  }

  // --- State machine -------------------------------------------------------

  /**
   * Moves an order from AWAITING_PAYMENT into PAYMENT_PROCESSING. Called when a payment attempt
   * begins (TMS-B5-001).
   */
  async beginPayment(orderId: string, ctx: OrderStateContext): Promise<OrderContract> {
    const order = await this.load(orderId);
    await this.applyTransition(orderId, order.status, OrderStatus.PAYMENT_PROCESSING, {
      ...ctx,
      reason: ctx.reason ?? 'Payment started.',
    });
    return this.getById(orderId);
  }

  /**
   * Confirms payment: every reservation is committed and the order becomes PAID. A hold that
   * expired underneath the checkout fails here before the order is marked paid, so a sale is
   * never recorded against stock that no longer exists — the payment layer then refunds and
   * fails the order (TMS-B5-001).
   */
  async confirmPayment(orderId: string, ctx: OrderStateContext): Promise<OrderContract> {
    const order = await this.load(orderId);
    if (
      order.status !== OrderStatus.AWAITING_PAYMENT &&
      order.status !== OrderStatus.PAYMENT_PROCESSING
    ) {
      throw this.invalidTransition(order.status, OrderStatus.PAID);
    }
    const reservationIds = order.items.map((item) => item.reservationId);
    await this.assertReservationsLive(reservationIds);
    for (const reservationId of reservationIds) await this.inventory.commit(reservationId);
    await this.applyTransition(orderId, order.status, OrderStatus.PAID, {
      ...ctx,
      reason: ctx.reason ?? 'Payment confirmed.',
      paidAt: new Date(),
    });
    return this.getById(orderId);
  }

  /**
   * Fails payment: every hold is released back to available stock and the order becomes
   * PAYMENT_FAILED. Releasing is idempotent, so a hold that already expired stays terminal.
   */
  async failPayment(orderId: string, ctx: OrderStateContext): Promise<OrderContract> {
    const order = await this.load(orderId);
    if (!canTransition(order.status, OrderStatus.PAYMENT_FAILED)) {
      throw this.invalidTransition(order.status, OrderStatus.PAYMENT_FAILED);
    }
    for (const item of order.items) await this.inventory.release(item.reservationId);
    await this.applyTransition(orderId, order.status, OrderStatus.PAYMENT_FAILED, {
      ...ctx,
      reason: ctx.reason ?? 'Payment failed.',
    });
    return this.getById(orderId);
  }

  /** A generic audited transition for operations tooling. Invalid moves are rejected. */
  async transition(
    orderId: string,
    to: OrderStatus,
    ctx: OrderStateContext,
  ): Promise<OrderContract> {
    const order = await this.load(orderId);
    await this.applyTransition(orderId, order.status, to, ctx);
    return this.getById(orderId);
  }

  private async applyTransition(
    orderId: string,
    from: OrderStatus,
    to: OrderStatus,
    ctx: OrderStateContext & { paidAt?: Date; cancelledAt?: Date },
  ): Promise<void> {
    if (!canTransition(from, to)) throw this.invalidTransition(from, to);
    await this.database.client.$transaction(async (tx) => {
      // Guard the update on the expected current status so a concurrent transition cannot be lost.
      const updated = await tx.order.updateMany({
        where: { id: orderId, status: from },
        data: {
          status: to,
          ...(ctx.paidAt ? { paidAt: ctx.paidAt } : {}),
          ...(ctx.cancelledAt ? { cancelledAt: ctx.cancelledAt } : {}),
        },
      });
      if (updated.count !== 1) throw this.invalidTransition(from, to);
      await tx.orderEvent.create({
        data: {
          orderId,
          fromStatus: from,
          toStatus: to,
          reason: ctx.reason ?? null,
          actorType: ctx.actorType ?? 'SYSTEM',
          actorUserId: ctx.actorUserId ?? null,
          correlationId: ctx.correlationId,
        },
      });
    });
  }

  // --- Helpers -------------------------------------------------------------

  private computeQuote(
    cart: CartContract,
    methodId: PlaceOrderDto['deliveryMethodId'],
    state: string,
  ): CheckoutQuote {
    const currency = cart.currency;
    const subtotalMinor = cart.subtotal.amountMinor;
    const discountMinor = cart.promotion?.discount.amountMinor ?? 0;
    const option = resolveDeliveryOption(methodId as DeliveryMethodId, state, currency);
    const taxableMinor = subtotalMinor - discountMinor;
    const taxMinor = taxMinorOf(taxableMinor);
    const deliveryMinor = option.price.amountMinor;
    const totalMinor = taxableMinor + deliveryMinor + taxMinor;
    return {
      currency,
      subtotal: { amountMinor: subtotalMinor, currency },
      discount: { amountMinor: discountMinor, currency },
      delivery: { amountMinor: deliveryMinor, currency },
      tax: { amountMinor: taxMinor, currency },
      total: { amountMinor: totalMinor, currency },
      deliveryMethod: deliveryMethodOf(option),
      promotion: cart.promotion,
    };
  }

  private assertPurchasable(cart: CartContract): void {
    if (cart.items.length === 0) {
      throw new ApiProblemException('CONFLICT', HttpStatus.CONFLICT, 'Your cart is empty.');
    }
    if (cart.hasIssues) {
      // Fail before payment, never at it: an unavailable line is refused at the cart.
      throw new ApiProblemException(
        'CONFLICT',
        HttpStatus.CONFLICT,
        'One or more items are no longer available. Update your cart before checking out.',
      );
    }
  }

  private async lineDetail(cartId: string) {
    const rows = await this.database.client.cartLine.findMany({
      where: { cartId },
      select: {
        id: true,
        configurationHash: true,
        artworkVersion: { select: { title: true } },
        garmentVariant: {
          select: {
            sku: true,
            colour: { select: { name: true } },
            size: { select: { label: true } },
            template: { select: { title: true } },
          },
        },
      },
    });
    return new Map(rows.map((row) => [row.id, row]));
  }

  private async assertReservationsLive(reservationIds: string[]): Promise<void> {
    const live = await this.database.client.inventoryReservation.count({
      where: { id: { in: reservationIds }, status: 'ACTIVE', expiresAt: { gt: new Date() } },
    });
    if (live !== reservationIds.length) {
      throw new ApiProblemException(
        'INVENTORY_UNAVAILABLE',
        HttpStatus.CONFLICT,
        'The stock reserved for this order has expired.',
      );
    }
  }

  private async releaseAll(reservationIds: string[]): Promise<void> {
    for (const reservationId of reservationIds) await this.inventory.release(reservationId);
  }

  private async load(orderId: string): Promise<OrderRecord> {
    const order = await this.database.client.order.findUnique({
      where: { id: orderId },
      include: withDetail,
    });
    if (!order) throw this.notFound();
    return order;
  }

  private ownershipWhere(session: AuthenticatedSession): Prisma.OrderWhereInput {
    const userId = session.session.user.id;
    // A signed-in customer sees their own orders and any guest order placed with their verified
    // email address, so a guest purchase reconciles onto the account on sign-in.
    return {
      OR: [
        { userId },
        { userId: null, normalizedEmail: normalizeEmail(session.session.user.email) },
      ],
    };
  }

  private toContract(order: OrderRecord): OrderContract {
    const currency = order.currency;
    const option = resolveDeliveryOption(order.deliveryMethod, order.addressState, currency);
    return {
      reference: order.reference,
      status: order.status,
      placedAt: order.placedAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      contact: { email: order.contactEmail, name: order.contactName, phone: order.contactPhone },
      address: {
        state: order.addressState,
        city: order.addressCity,
        line1: order.addressLine1,
        line2: order.addressLine2,
        postcode: order.addressPostcode,
      },
      deliveryMethod: deliveryMethodOf(option),
      items: order.items.map((item) => this.toItem(item)),
      currency,
      subtotal: this.money(order.subtotalMinor, currency),
      discount: this.money(order.discountMinor, currency),
      delivery: this.money(order.deliveryMinor, currency),
      tax: this.money(order.taxMinor, currency),
      total: this.money(order.totalMinor, currency),
      promotion: this.promotionOf(order),
      payment: this.paymentOf(order.status),
      timeline: order.events.map((event): OrderTimelineEntry => ({
        status: event.toStatus,
        at: event.createdAt.toISOString(),
        reason: event.reason,
      })),
    };
  }

  private toItem(item: OrderRecord['items'][number]): OrderItemContract {
    return {
      id: item.id,
      artworkVersionId: item.artworkVersionId,
      garmentVariantId: item.garmentVariantId,
      placementId: item.placementId,
      scalePresetId: item.scalePresetId,
      view: item.view,
      configurationHash: item.configurationHash,
      quantity: item.quantity,
      unitPrice: this.money(item.unitPriceMinor, item.currency),
      lineTotal: this.money(item.lineTotalMinor, item.currency),
      artworkTitle: item.artworkTitle,
      garmentTitle: item.garmentTitle,
      colourName: item.colourName,
      sizeLabel: item.sizeLabel,
      sku: item.sku,
    };
  }

  private promotionOf(order: OrderRecord): AppliedPromotion | null {
    if (!order.promotionCode || order.discountMinor <= 0) return null;
    return {
      code: order.promotionCode,
      label: order.promotionLabel ?? order.promotionCode,
      discount: this.money(order.discountMinor, order.currency),
    };
  }

  /**
   * A minimal payment view derived from order status. TMS-B4-003 records no payment record and no
   * provider; TMS-B5-001 owns the real handoff (intent, reference, redirect).
   */
  private paymentOf(status: OrderStatus): OrderPaymentHandoff {
    const map: Partial<Record<OrderStatus, PaymentStatus>> = {
      [OrderStatus.PAID]: 'SUCCEEDED',
      [OrderStatus.PAYMENT_PROCESSING]: 'PROCESSING',
      [OrderStatus.PAYMENT_FAILED]: 'FAILED',
      [OrderStatus.PAYMENT_CANCELLED]: 'CANCELLED',
      [OrderStatus.REFUNDED]: 'REFUNDED',
      [OrderStatus.PARTIALLY_REFUNDED]: 'PARTIALLY_REFUNDED',
    };
    return { status: map[status] ?? 'PENDING', provider: null, reference: null, redirectUrl: null };
  }

  private money(amountMinor: number, currency: string): Money {
    return { amountMinor, currency };
  }

  private newReference(): string {
    return `TMS-${randomBytes(5).toString('hex').toUpperCase()}`;
  }

  private isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private notFound(): ApiProblemException {
    return new ApiProblemException('RESOURCE_NOT_FOUND', HttpStatus.NOT_FOUND, 'Order not found.');
  }

  private cartChanged(): ApiProblemException {
    return new ApiProblemException(
      'CONFLICT',
      HttpStatus.CONFLICT,
      'Your cart changed during checkout. Review it and try again.',
    );
  }

  private invalidTransition(from: OrderStatus, to: OrderStatus): ApiProblemException {
    return new ApiProblemException(
      'CONFLICT',
      HttpStatus.CONFLICT,
      `An order cannot move from ${from} to ${to}.`,
    );
  }
}
