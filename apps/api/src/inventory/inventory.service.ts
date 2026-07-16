import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  InventoryMovementKind,
  InventoryReservationStatus,
  type DatabaseClient,
  type Prisma,
} from '@tms/database';

import type {
  AdminAuthenticatedSession,
  AdminRequestContext,
} from '../admin-auth/admin-auth.types.js';
import { DatabaseService } from '../database/database.service.js';
import { ApiProblemException } from '../platform/api-problem.exception.js';
import type {
  InventoryAdjustmentDto,
  InventoryReceiptDto,
  InventoryThresholdDto,
} from './inventory.dto.js';

type Transaction = Prisma.TransactionClient;

export interface StockLevel {
  variantId: string;
  sku: string;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  lowStock: boolean;
}

export interface ReservationResult {
  id: string;
  variantId: string;
  quantity: number;
  status: InventoryReservationStatus;
  reference: string;
  expiresAt: string;
  createdAt: string;
}

@Injectable()
export class InventoryService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  /**
   * Locks the variant's inventory row for the rest of the transaction. Every concurrent
   * reservation or stock change for that variant serialises here, which is what makes the
   * final-unit race safe: two callers cannot both read the same availability and both succeed.
   * Callers must already be inside a transaction.
   */
  private async lockItem(
    transaction: Transaction,
    variantId: string,
  ): Promise<{ id: string; on_hand: number }> {
    const rows = await transaction.$queryRaw<Array<{ id: string; on_hand: number }>>`
      SELECT "id", "on_hand" FROM "inventory_items" WHERE "variant_id" = ${variantId}::uuid FOR UPDATE
    `;
    const item = rows[0];
    if (!item) throw this.notFound();
    return item;
  }

  /**
   * Expires stale holds so they stop consuming availability, then returns the quantity still
   * genuinely reserved. Expiry is evaluated on the hot path rather than relying on a sweeper,
   * so an expired hold never blocks a sale even if the background sweep is not running.
   */
  private async reservedQuantity(
    transaction: Transaction,
    itemId: string,
    now: Date,
  ): Promise<number> {
    await transaction.inventoryReservation.updateMany({
      where: { itemId, status: InventoryReservationStatus.ACTIVE, expiresAt: { lte: now } },
      data: { status: InventoryReservationStatus.EXPIRED },
    });
    const active = await transaction.inventoryReservation.aggregate({
      where: { itemId, status: InventoryReservationStatus.ACTIVE },
      _sum: { quantity: true },
    });
    return active._sum.quantity ?? 0;
  }

  private async record(
    transaction: Transaction,
    input: {
      itemId: string;
      kind: InventoryMovementKind;
      quantityDelta: number;
      onHandAfter: number;
      reason?: string | null;
      reference?: string | null;
      actorUserId?: string | null;
    },
  ): Promise<void> {
    await transaction.inventoryMovement.create({
      data: {
        itemId: input.itemId,
        kind: input.kind,
        quantityDelta: input.quantityDelta,
        onHandAfter: input.onHandAfter,
        reason: input.reason ?? null,
        reference: input.reference ?? null,
        createdByUserId: input.actorUserId ?? null,
      },
    });
  }

  /** Stock is tracked per variant and created on first use, so a variant starts at zero. */
  private async ensureItem(transaction: Transaction, variantId: string): Promise<string> {
    const variant = await transaction.garmentVariant.findUnique({
      where: { id: variantId },
      select: { id: true },
    });
    if (!variant) throw this.notFound();
    const item = await transaction.inventoryItem.upsert({
      where: { variantId },
      update: {},
      create: { variantId },
      select: { id: true },
    });
    return item.id;
  }

  async receive(
    actor: AdminAuthenticatedSession,
    variantId: string,
    input: InventoryReceiptDto,
    context: AdminRequestContext,
  ): Promise<StockLevel> {
    return this.mutate(actor, 'inventory.receive', variantId, context, () =>
      this.database.client.$transaction(async (transaction) => {
        await this.ensureItem(transaction, variantId);
        const item = await this.lockItem(transaction, variantId);
        const onHandAfter = item.on_hand + input.quantity;
        await transaction.inventoryItem.update({
          where: { id: item.id },
          data: { onHand: onHandAfter },
        });
        await this.record(transaction, {
          itemId: item.id,
          kind: InventoryMovementKind.RECEIPT,
          quantityDelta: input.quantity,
          onHandAfter,
          reason: input.reason,
          reference: input.reference,
          actorUserId: actor.session.user.id,
        });
        return this.level(transaction, variantId);
      }),
    );
  }

  async adjust(
    actor: AdminAuthenticatedSession,
    variantId: string,
    input: InventoryAdjustmentDto,
    context: AdminRequestContext,
  ): Promise<StockLevel> {
    // A movement that moves nothing is a bug, not a record. The database rejects it too, but
    // reaching that constraint would surface as an opaque 500 instead of a validation error.
    if (input.quantityDelta === 0) {
      throw this.problem(
        'VALIDATION_FAILED',
        HttpStatus.BAD_REQUEST,
        'An adjustment must change the quantity.',
      );
    }
    // Stock arrives through a return and leaves through damage. The database enforces the same
    // direction, but reaching that constraint would surface as an opaque 500.
    const kind = input.kind ?? InventoryMovementKind.ADJUSTMENT;
    if (kind === InventoryMovementKind.RETURN && input.quantityDelta < 0) {
      throw this.problem('VALIDATION_FAILED', HttpStatus.BAD_REQUEST, 'A return must add stock.');
    }
    if (kind === InventoryMovementKind.DAMAGE && input.quantityDelta > 0) {
      throw this.problem('VALIDATION_FAILED', HttpStatus.BAD_REQUEST, 'Damage must remove stock.');
    }
    return this.mutate(actor, 'inventory.adjust', variantId, context, () =>
      this.database.client.$transaction(async (transaction) => {
        await this.ensureItem(transaction, variantId);
        const item = await this.lockItem(transaction, variantId);
        const onHandAfter = item.on_hand + input.quantityDelta;
        if (onHandAfter < 0) {
          throw this.problem(
            'VALIDATION_FAILED',
            HttpStatus.BAD_REQUEST,
            'An adjustment cannot take stock below zero.',
          );
        }
        // Stock already promised to a live reservation cannot be adjusted away, or the holder
        // would reach checkout against stock that no longer exists.
        const reserved = await this.reservedQuantity(transaction, item.id, new Date());
        if (onHandAfter < reserved) {
          throw this.problem(
            'INVENTORY_UNAVAILABLE',
            HttpStatus.CONFLICT,
            `An adjustment cannot take stock below the ${reserved} unit(s) currently reserved.`,
          );
        }
        await transaction.inventoryItem.update({
          where: { id: item.id },
          data: { onHand: onHandAfter },
        });
        await this.record(transaction, {
          itemId: item.id,
          kind,
          quantityDelta: input.quantityDelta,
          onHandAfter,
          reason: input.reason,
          reference: input.reference,
          actorUserId: actor.session.user.id,
        });
        return this.level(transaction, variantId);
      }),
    );
  }

  async setThreshold(
    actor: AdminAuthenticatedSession,
    variantId: string,
    input: InventoryThresholdDto,
    context: AdminRequestContext,
  ): Promise<StockLevel> {
    return this.mutate(actor, 'inventory.threshold.set', variantId, context, () =>
      this.database.client.$transaction(async (transaction) => {
        await this.ensureItem(transaction, variantId);
        await transaction.inventoryItem.update({
          where: { variantId },
          data: { lowStockThreshold: input.lowStockThreshold },
        });
        return this.level(transaction, variantId);
      }),
    );
  }

  /**
   * Places an expiring hold. Not exposed over HTTP: TMS-B4-002 carts and TMS-B4-003 checkouts
   * own reservation lifetime. The row lock serialises concurrent callers for the same variant.
   */
  async reserve(input: {
    variantId: string;
    quantity: number;
    reference: string;
    ttlSeconds: number;
  }): Promise<ReservationResult> {
    if (input.quantity < 1) {
      throw this.problem('VALIDATION_FAILED', HttpStatus.BAD_REQUEST, 'Quantity must be positive.');
    }
    return this.database.client.$transaction(async (transaction) => {
      const item = await this.lockItem(transaction, input.variantId);
      const now = new Date();
      const reserved = await this.reservedQuantity(transaction, item.id, now);
      const available = item.on_hand - reserved;
      if (available < input.quantity) {
        throw this.problem(
          'INVENTORY_UNAVAILABLE',
          HttpStatus.CONFLICT,
          `Only ${Math.max(available, 0)} unit(s) are available.`,
        );
      }
      const reservation = await transaction.inventoryReservation.create({
        data: {
          itemId: item.id,
          quantity: input.quantity,
          reference: input.reference,
          expiresAt: new Date(now.getTime() + input.ttlSeconds * 1_000),
        },
      });
      return {
        id: reservation.id,
        variantId: input.variantId,
        quantity: reservation.quantity,
        status: reservation.status,
        reference: reservation.reference,
        expiresAt: reservation.expiresAt.toISOString(),
        createdAt: reservation.createdAt.toISOString(),
      };
    });
  }

  /** Releasing is idempotent: a hold that already ended stays in its terminal state. */
  async release(reservationId: string): Promise<void> {
    await this.database.client.inventoryReservation.updateMany({
      where: { id: reservationId, status: InventoryReservationStatus.ACTIVE },
      data: { status: InventoryReservationStatus.RELEASED, releasedAt: new Date() },
    });
  }

  /**
   * Converts a live hold into a sale: stock leaves and the ledger records why. An expired hold
   * cannot be committed, because its units may already have been sold to someone else.
   */
  async commit(reservationId: string): Promise<StockLevel> {
    return this.database.client.$transaction(async (transaction) => {
      const reservation = await transaction.inventoryReservation.findUnique({
        where: { id: reservationId },
        include: { item: { select: { variantId: true } } },
      });
      if (!reservation) throw this.notFound();
      const item = await this.lockItem(transaction, reservation.item.variantId);
      const now = new Date();
      if (
        reservation.status !== InventoryReservationStatus.ACTIVE ||
        reservation.expiresAt <= now
      ) {
        throw this.problem(
          'INVENTORY_UNAVAILABLE',
          HttpStatus.CONFLICT,
          'Only a live reservation can be committed.',
        );
      }
      const onHandAfter = item.on_hand - reservation.quantity;
      if (onHandAfter < 0) {
        // Unreachable while reservations are honoured, but refuse rather than oversell.
        throw this.problem(
          'INVENTORY_UNAVAILABLE',
          HttpStatus.CONFLICT,
          'Committing this reservation would take stock below zero.',
        );
      }
      await transaction.inventoryItem.update({
        where: { id: item.id },
        data: { onHand: onHandAfter },
      });
      await transaction.inventoryReservation.update({
        where: { id: reservation.id },
        data: { status: InventoryReservationStatus.COMMITTED, committedAt: now },
      });
      await this.record(transaction, {
        itemId: item.id,
        kind: InventoryMovementKind.SALE,
        quantityDelta: -reservation.quantity,
        onHandAfter,
        reference: reservation.reference,
      });
      return this.level(transaction, reservation.item.variantId);
    });
  }

  /** Background sweep. Correctness does not depend on it; the hot path expires lazily too. */
  async sweepExpired(now = new Date()): Promise<number> {
    const result = await this.database.client.inventoryReservation.updateMany({
      where: { status: InventoryReservationStatus.ACTIVE, expiresAt: { lte: now } },
      data: { status: InventoryReservationStatus.EXPIRED },
    });
    return result.count;
  }

  async getLevel(variantId: string): Promise<StockLevel> {
    return this.level(this.database.client, variantId);
  }

  async listLevels(lowStockOnly = false): Promise<StockLevel[]> {
    const items = await this.database.client.inventoryItem.findMany({
      include: { variant: { select: { sku: true } } },
      orderBy: { variant: { sku: 'asc' } },
    });
    const levels = await Promise.all(
      items.map((item) => this.level(this.database.client, item.variantId)),
    );
    return lowStockOnly ? levels.filter((level) => level.lowStock) : levels;
  }

  async listMovements(variantId: string) {
    const item = await this.database.client.inventoryItem.findUnique({
      where: { variantId },
      select: { id: true },
    });
    if (!item) throw this.notFound();
    return this.database.client.inventoryMovement.findMany({
      where: { itemId: item.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async level(
    client: DatabaseClient | Transaction,
    variantId: string,
  ): Promise<StockLevel> {
    const item = await client.inventoryItem.findUnique({
      where: { variantId },
      include: { variant: { select: { sku: true } } },
    });
    if (!item) throw this.notFound();
    const active = await client.inventoryReservation.aggregate({
      where: {
        itemId: item.id,
        status: InventoryReservationStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
      _sum: { quantity: true },
    });
    const reserved = active._sum.quantity ?? 0;
    const available = item.onHand - reserved;
    return {
      variantId,
      sku: item.variant.sku,
      onHand: item.onHand,
      reserved,
      available,
      lowStockThreshold: item.lowStockThreshold,
      lowStock: available <= item.lowStockThreshold,
    };
  }

  private async mutate<T>(
    actor: AdminAuthenticatedSession,
    action: string,
    resourceId: string,
    context: AdminRequestContext,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      const result = await operation();
      await this.audit(actor, action, resourceId, context, 'SUCCESS');
      return result;
    } catch (error) {
      await this.audit(actor, action, resourceId, context, 'FAILURE');
      throw error;
    }
  }

  private async audit(
    actor: AdminAuthenticatedSession,
    action: string,
    resourceId: string,
    context: AdminRequestContext,
    outcome: 'SUCCESS' | 'FAILURE',
  ): Promise<void> {
    // AuditLog deliberately stores no raw client address: the model exposes ipAddressHash only.
    // Record the same fields the catalogue and garment modules record, and nothing more.
    await this.database.client.auditLog.create({
      data: {
        actorType: 'USER',
        actorUserId: actor.session.user.id,
        action,
        resourceType: 'inventory',
        resourceId,
        outcome,
        correlationId: context.correlationId,
      },
    });
  }

  private notFound(): ApiProblemException {
    return new ApiProblemException(
      'RESOURCE_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      'Garment variant stock not found.',
    );
  }

  private problem(
    code: 'VALIDATION_FAILED' | 'INVENTORY_UNAVAILABLE',
    status: HttpStatus,
    message: string,
  ): ApiProblemException {
    return new ApiProblemException(code, status, message);
  }
}
