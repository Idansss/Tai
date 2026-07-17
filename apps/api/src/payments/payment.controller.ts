import { Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ApiResponse, OrderPaymentHandoff } from '@tms/contracts';
import type { Request } from 'express';

import { PaymentService } from './payment.service.js';

/**
 * Payment initiation, status, and reconciliation are keyed by the order reference so a guest — who
 * has no session but does hold the reference from their placement response — can complete
 * checkout. The reference is the capability; no order data beyond payment status is exposed.
 */
@ApiTags('payments')
@Controller('orders')
export class PaymentController {
  constructor(@Inject(PaymentService) private readonly payments: PaymentService) {}

  @Post(':reference/payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'initiateOrderPayment',
    summary: 'Start (or resume) a payment for an order awaiting payment',
  })
  @ApiOkResponse({ description: 'The payment handoff, including any provider redirect.' })
  async initiate(
    @Param('reference') reference: string,
    @Req() request: Request,
  ): Promise<ApiResponse<OrderPaymentHandoff>> {
    return this.respond(
      request,
      await this.payments.initiate(reference, request.correlationId ?? 'unavailable'),
    );
  }

  @Get(':reference/payment')
  @ApiOperation({
    operationId: 'getOrderPayment',
    summary: 'Read the current payment handoff for an order',
  })
  @ApiOkResponse({ description: 'The latest payment handoff for the order.' })
  async get(
    @Param('reference') reference: string,
    @Req() request: Request,
  ): Promise<ApiResponse<OrderPaymentHandoff>> {
    return this.respond(request, await this.payments.getForOrder(reference));
  }

  @Post(':reference/payment/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'verifyOrderPayment',
    summary: 'Reconcile the order against the provider when a webhook may have been missed',
  })
  @ApiOkResponse({ description: 'The reconciled payment handoff.' })
  async verify(
    @Param('reference') reference: string,
    @Req() request: Request,
  ): Promise<ApiResponse<OrderPaymentHandoff>> {
    return this.respond(
      request,
      await this.payments.reconcile(reference, request.correlationId ?? 'unavailable'),
    );
  }

  private respond<T>(request: Request, data: T): ApiResponse<T> {
    return { data, meta: { correlationId: request.correlationId ?? 'unavailable' } };
  }
}
