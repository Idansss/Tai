import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { ApiResponse, CheckoutQuote, DeliveryOption } from '@tms/contracts';
import type { Request, Response } from 'express';

import { AuthService } from '../auth/auth.service.js';
import { AUTH_CONFIG } from '../auth/auth.tokens.js';
import type { AuthConfig } from '../auth/auth.types.js';
import { resolveCartOwner } from './checkout-owner.js';
import { CheckoutAddressDto, CheckoutContactDto, CheckoutQuoteDto } from './order.dto.js';
import { OrderService } from './order.service.js';

@ApiTags('checkout')
// Value imports so the ValidationPipe keeps validating the body under emitDecoratorMetadata.
@ApiExtraModels(CheckoutQuoteDto, CheckoutAddressDto, CheckoutContactDto)
@Controller('checkout')
export class CheckoutController {
  constructor(
    @Inject(OrderService) private readonly orders: OrderService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  @Get('delivery-options')
  @ApiOperation({
    operationId: 'getDeliveryOptions',
    summary: 'List server-authoritative delivery methods and fees for a destination',
  })
  @ApiQuery({ name: 'state', required: false })
  @ApiOkResponse({ description: 'The delivery options for the destination state.' })
  getDeliveryOptions(
    @Req() request: Request,
    @Query('state') state?: string,
  ): ApiResponse<DeliveryOption[]> {
    return this.respond(request, this.orders.deliveryOptions(state ?? ''));
  }

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'createCheckoutQuote',
    summary: 'Quote the authoritative delivery, tax, and total for the current cart',
  })
  @ApiOkResponse({ description: 'The authoritative quote for the current cart.' })
  async quote(
    @Body() body: CheckoutQuoteDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponse<CheckoutQuote>> {
    const owner = await resolveCartOwner(request, response, this.auth, this.config);
    return this.respond(request, await this.orders.quote(owner, body));
  }

  private respond<T>(request: Request, data: T): ApiResponse<T> {
    return { data, meta: { correlationId: request.correlationId ?? 'unavailable' } };
  }
}
