import { createHash, randomBytes } from 'node:crypto';

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  configurationCanonicalForm,
  type Cart as CartContract,
  type CartLine as CartLineContract,
  type CartLineIssue,
} from '@tms/contracts';
import { PromotionKind, PromotionStatus, type GarmentView, type Prisma } from '@tms/database';

import { DatabaseService } from '../database/database.service.js';
import { GarmentService } from '../garments/garment.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { ApiProblemException } from '../platform/api-problem.exception.js';
import type { AddCartLineDto, PromotionCodeDto, UpdateCartLineDto } from './cart.dto.js';

/** The base currency. Every priced pair settles in NGN today (ADR-015). */
const FALLBACK_CURRENCY = 'NGN';

export interface CartOwner {
  userId?: string;
  guestToken?: string;
}

const withLines = {
  lines: {
    orderBy: { createdAt: 'asc' },
    include: { garmentVariant: { select: { templateId: true } } },
  },
  promotion: true,
} as const;

type CartRecord = Prisma.CartGetPayload<{ include: typeof withLines }>;

@Injectable()
export class CartService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(GarmentService) private readonly garments: GarmentService,
    @Inject(InventoryService) private readonly inventory: InventoryService,
  ) {}

  newGuestToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hash(input: {
    artworkVersionId: string;
    garmentVariantId: string;
    placementId: string;
    scalePresetId: string;
    view: GarmentView;
  }): string {
    return createHash('sha256').update(configurationCanonicalForm(input)).digest('hex');
  }

  /**
   * Resolves the caller's cart, creating one on demand.
   *
   * When a signed-in customer still carries a guest token, the guest cart is merged into theirs
   * and removed. Merging adds quantities for configurations they already had, capped at the line
   * maximum, so signing in never silently loses or duplicates a chosen configuration.
   */
  async resolve(owner: CartOwner): Promise<CartRecord> {
    if (!owner.userId && !owner.guestToken) {
      throw new ApiProblemException(
        'VALIDATION_FAILED',
        HttpStatus.BAD_REQUEST,
        'A cart owner is required.',
      );
    }
    if (!owner.userId) {
      const guest = await this.database.client.cart.findUnique({
        where: { guestToken: owner.guestToken! },
        include: withLines,
      });
      return guest ?? this.create({ guestToken: owner.guestToken! });
    }

    const mine =
      (await this.database.client.cart.findUnique({
        where: { userId: owner.userId },
        include: withLines,
      })) ?? (await this.create({ userId: owner.userId }));

    if (!owner.guestToken) return mine;
    const guest = await this.database.client.cart.findUnique({
      where: { guestToken: owner.guestToken },
      include: withLines,
    });
    if (!guest || guest.id === mine.id) return mine;
    return this.merge(guest, mine);
  }

  private async create(owner: CartOwner): Promise<CartRecord> {
    return this.database.client.cart.create({
      data: { userId: owner.userId ?? null, guestToken: owner.guestToken ?? null },
      include: withLines,
    });
  }

  private async merge(guest: CartRecord, mine: CartRecord): Promise<CartRecord> {
    await this.database.client.$transaction(async (transaction) => {
      for (const line of guest.lines) {
        const existing = mine.lines.find(
          (candidate) => candidate.configurationHash === line.configurationHash,
        );
        if (existing) {
          await transaction.cartLine.update({
            where: { id: existing.id },
            data: { quantity: Math.min(existing.quantity + line.quantity, 20) },
          });
        } else {
          await transaction.cartLine.update({ where: { id: line.id }, data: { cartId: mine.id } });
        }
      }
      // A guest promotion carries over only when the customer had not chosen one themselves.
      if (!mine.promotionId && guest.promotionId) {
        await transaction.cart.update({
          where: { id: mine.id },
          data: { promotionId: guest.promotionId },
        });
      }
      await transaction.cart.delete({ where: { id: guest.id } });
    });
    return this.database.client.cart.findUniqueOrThrow({
      where: { id: mine.id },
      include: withLines,
    });
  }

  async addLine(owner: CartOwner, input: AddCartLineDto): Promise<CartContract> {
    const cart = await this.resolve(owner);
    // Server-authoritative: the approved tuple is revalidated and priced here. A browser never
    // supplies a price, and an unapproved configuration cannot enter a cart at all.
    const validation = await this.garments.validateConfiguration({
      artworkVersionId: input.artworkVersionId,
      garmentVariantId: input.garmentVariantId,
      placementId: input.placementId,
      scalePreset: input.scalePreset,
      view: input.view,
      quantity: input.quantity,
    });

    const hash = this.hash(validation);
    const existing = cart.lines.find((line) => line.configurationHash === hash);
    const wanted = Math.min((existing?.quantity ?? 0) + input.quantity, 20);

    // Refuse rather than accept a quantity that cannot be fulfilled. Stock is not held here;
    // the hold is taken at checkout (ADR-017).
    const available = await this.inventory.availableQuantity(validation.garmentVariantId);
    if (available < wanted) {
      throw new ApiProblemException(
        'INVENTORY_UNAVAILABLE',
        HttpStatus.CONFLICT,
        available === 0
          ? 'This configuration is out of stock.'
          : `Only ${available} unit(s) are available.`,
      );
    }

    if (existing) {
      await this.database.client.cartLine.update({
        where: { id: existing.id },
        data: { quantity: wanted },
      });
    } else {
      await this.database.client.cartLine.create({
        data: {
          cartId: cart.id,
          artworkVersionId: validation.artworkVersionId,
          garmentVariantId: validation.garmentVariantId,
          placementId: validation.placementId,
          scalePresetId: validation.scalePresetId,
          view: validation.view,
          quantity: input.quantity,
          configurationHash: hash,
        },
      });
    }
    await this.touch(cart.id);
    return this.read(owner);
  }

  async updateLine(
    owner: CartOwner,
    lineId: string,
    input: UpdateCartLineDto,
  ): Promise<CartContract> {
    const cart = await this.resolve(owner);
    const line = cart.lines.find((candidate) => candidate.id === lineId);
    // A line belonging to another cart is reported as not found, so identifiers cannot be probed.
    if (!line) throw this.lineNotFound();

    const available = await this.inventory.availableQuantity(line.garmentVariantId);
    if (available < input.quantity) {
      throw new ApiProblemException(
        'INVENTORY_UNAVAILABLE',
        HttpStatus.CONFLICT,
        `Only ${available} unit(s) are available.`,
      );
    }
    await this.database.client.cartLine.update({
      where: { id: lineId },
      data: { quantity: input.quantity },
    });
    await this.touch(cart.id);
    return this.read(owner);
  }

  async removeLine(owner: CartOwner, lineId: string): Promise<CartContract> {
    const cart = await this.resolve(owner);
    const line = cart.lines.find((candidate) => candidate.id === lineId);
    if (!line) throw this.lineNotFound();
    await this.database.client.cartLine.delete({ where: { id: lineId } });
    await this.touch(cart.id);
    return this.read(owner);
  }

  async applyPromotion(owner: CartOwner, input: PromotionCodeDto): Promise<CartContract> {
    const cart = await this.resolve(owner);
    const now = new Date();
    const promotion = await this.database.client.promotion.findUnique({
      where: { code: input.code },
    });
    // One safe answer for every rejection: an unknown, disabled, or out-of-window code must not
    // reveal which of those it was.
    const usable =
      promotion &&
      promotion.status === PromotionStatus.ACTIVE &&
      (!promotion.startsAt || promotion.startsAt <= now) &&
      (!promotion.endsAt || promotion.endsAt > now);
    if (!usable) {
      throw new ApiProblemException(
        'PROMOTION_INVALID',
        HttpStatus.UNPROCESSABLE_ENTITY,
        'That promotion code is not valid.',
      );
    }
    await this.database.client.cart.update({
      where: { id: cart.id },
      data: { promotionId: promotion.id },
    });
    await this.touch(cart.id);
    return this.read(owner);
  }

  async removePromotion(owner: CartOwner): Promise<CartContract> {
    const cart = await this.resolve(owner);
    await this.database.client.cart.update({ where: { id: cart.id }, data: { promotionId: null } });
    return this.read(owner);
  }

  /**
   * Recomputes the whole cart from current catalogue, price, and stock state. Nothing about a
   * price or an availability is stored on the line, so a cart can never quote yesterday's price.
   */
  async read(owner: CartOwner): Promise<CartContract> {
    const cart = await this.resolve(owner);
    const items: CartLineContract[] = [];
    let subtotalMinor = 0;
    let currency = FALLBACK_CURRENCY;

    for (const line of cart.lines) {
      const priced = await this.priceLine(line);
      items.push(priced.item);
      if (priced.item.unitPrice) currency = priced.item.unitPrice.currency;
      if (priced.item.lineTotal && !priced.item.issue) {
        subtotalMinor += priced.item.lineTotal.amountMinor;
      }
    }

    const discountMinor = this.discountFor(cart, subtotalMinor, currency);
    return {
      id: cart.id,
      currency,
      items,
      subtotal: { amountMinor: subtotalMinor, currency },
      promotion:
        cart.promotion && discountMinor > 0
          ? {
              code: cart.promotion.code,
              label: cart.promotion.label,
              discount: { amountMinor: discountMinor, currency },
            }
          : null,
      // Delivery and tax are deliberately absent; they belong to the checkout quote.
      total: { amountMinor: Math.max(subtotalMinor - discountMinor, 0), currency },
      hasIssues: items.some((item) => item.issue !== null),
    };
  }

  private async priceLine(line: CartRecord['lines'][number]): Promise<{ item: CartLineContract }> {
    const base = {
      lineId: line.id,
      artworkId: '',
      artworkVersionId: line.artworkVersionId,
      garmentTemplateId: line.garmentVariant.templateId,
      garmentVariantId: line.garmentVariantId,
      placementId: line.placementId,
      scalePresetId: line.scalePresetId,
      view: line.view,
      quantity: line.quantity,
    };

    const scalePreset = await this.database.client.garmentScalePreset.findUnique({
      where: { id: line.scalePresetId },
      select: { slug: true },
    });
    let validation;
    try {
      validation = await this.garments.validateConfiguration({
        artworkVersionId: line.artworkVersionId,
        garmentVariantId: line.garmentVariantId,
        placementId: line.placementId,
        scalePreset: scalePreset?.slug ?? '',
        view: line.view,
        quantity: line.quantity,
      });
    } catch {
      // The configuration stopped being approved or published while it sat in the cart. Report
      // it honestly rather than dropping the line or guessing a price.
      return {
        item: {
          ...base,
          unitPrice: null,
          lineTotal: null,
          availableQuantity: 0,
          issue: 'CONFIGURATION_NOT_APPROVED',
        },
      };
    }

    const available = await this.inventory.availableQuantity(line.garmentVariantId);
    const issue = this.issueFor(validation.availability.state, available, line.quantity);
    return {
      item: {
        ...base,
        artworkId: validation.artworkId,
        unitPrice: validation.unitPrice,
        lineTotal: {
          amountMinor: validation.unitPrice.amountMinor * line.quantity,
          currency: validation.unitPrice.currency,
        },
        availableQuantity: available,
        issue,
      },
    };
  }

  private issueFor(
    availabilityState: string,
    available: number,
    quantity: number,
  ): CartLineIssue | null {
    if (availabilityState === 'DROP_NOT_OPEN') return 'DROP_NOT_OPEN';
    if (availabilityState === 'DROP_ENDED') return 'DROP_ENDED';
    if (available === 0) return 'OUT_OF_STOCK';
    if (available < quantity) return 'INSUFFICIENT_STOCK';
    return null;
  }

  /**
   * Integer arithmetic only. A discount never exceeds the subtotal, and a fixed-amount code in
   * another currency is ignored rather than applied at the wrong rate.
   */
  private discountFor(cart: CartRecord, subtotalMinor: number, currency: string): number {
    const promotion = cart.promotion;
    if (!promotion || subtotalMinor <= 0) return 0;
    if (promotion.minSubtotalMinor && subtotalMinor < promotion.minSubtotalMinor) return 0;

    let discount: number;
    if (promotion.kind === PromotionKind.PERCENT_OFF) {
      discount = Math.floor((subtotalMinor * promotion.value) / 100);
    } else {
      if (promotion.currency !== currency) return 0;
      discount = promotion.value;
    }
    if (promotion.maxDiscountMinor) discount = Math.min(discount, promotion.maxDiscountMinor);
    return Math.min(discount, subtotalMinor);
  }

  private async touch(cartId: string): Promise<void> {
    await this.database.client.cart.update({
      where: { id: cartId },
      data: { lastActivityAt: new Date() },
    });
  }

  private lineNotFound(): ApiProblemException {
    return new ApiProblemException(
      'RESOURCE_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      'Cart line not found.',
    );
  }
}
