import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { ApiResponse, Order, OrderSummary } from '@tms/contracts';
import type { Request, Response } from 'express';

import { AuthService } from '../auth/auth.service.js';
import { AUTH_CONFIG } from '../auth/auth.tokens.js';
import type { AuthConfig } from '../auth/auth.types.js';
import { SessionGuard } from '../auth/session.guard.js';
import { resolveCartOwner } from './checkout-owner.js';
import { PlaceOrderDto } from './order.dto.js';
import { OrderService } from './order.service.js';

const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9_-]{7,119}$/;

@ApiTags('orders')
// Value import so the ValidationPipe keeps validating the body under emitDecoratorMetadata.
@ApiExtraModels(PlaceOrderDto)
@Controller('orders')
export class OrderController {
  constructor(
    @Inject(OrderService) private readonly orders: OrderService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  @Post()
  @ApiOperation({
    operationId: 'placeOrder',
    summary: 'Place an order from the current cart (guest or signed-in)',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Optional replay key; a retried checkout with the same key returns the same order.',
  })
  @ApiCreatedResponse({ description: 'The placed order, awaiting payment.' })
  async place(
    @Body() body: PlaceOrderDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponse<Order>> {
    const owner = await resolveCartOwner(request, response, this.auth, this.config);
    const key = idempotencyKey && IDEMPOTENCY_KEY.test(idempotencyKey) ? idempotencyKey : null;
    const order = await this.orders.place(owner, body, {
      correlationId: request.correlationId ?? 'unavailable',
      idempotencyKey: key,
    });
    return this.respond(request, order);
  }

  @Get()
  @UseGuards(SessionGuard)
  @ApiCookieAuth('tms_session')
  @ApiOperation({ operationId: 'listCustomerOrders', summary: 'List your order history' })
  @ApiOkResponse({ description: 'The signed-in customer’s orders, newest first.' })
  async list(@Req() request: Request): Promise<ApiResponse<OrderSummary[]>> {
    return this.respond(request, await this.orders.listForCustomer(request.authSession!));
  }

  @Get(':reference')
  @UseGuards(SessionGuard)
  @ApiCookieAuth('tms_session')
  @ApiOperation({ operationId: 'getCustomerOrder', summary: 'Read one of your orders in full' })
  @ApiOkResponse({ description: 'The full order with its snapshot and status timeline.' })
  async get(
    @Param('reference') reference: string,
    @Req() request: Request,
  ): Promise<ApiResponse<Order>> {
    return this.respond(request, await this.orders.getForCustomer(request.authSession!, reference));
  }

  private respond<T>(request: Request, data: T): ApiResponse<T> {
    return { data, meta: { correlationId: request.correlationId ?? 'unavailable' } };
  }
}
