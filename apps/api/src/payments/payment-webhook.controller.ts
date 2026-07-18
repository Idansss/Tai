import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ApiResponse } from '@tms/contracts';
import type { Request } from 'express';

import { PaymentService } from './payment.service.js';

@ApiTags('payments')
@Controller('payments')
export class PaymentWebhookController {
  constructor(@Inject(PaymentService) private readonly payments: PaymentService) {}

  @Post('webhooks/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'receivePaymentWebhook',
    summary: 'Receive a signed provider webhook',
  })
  async receive(
    @Param('provider') provider: string,
    // The HMAC over the raw body; never trust an unsigned webhook.
    @Headers('x-tms-signature') signature: string | undefined,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<ApiResponse<{ received: true }>> {
    // The raw bytes are verified against the signature; never trust the parsed body for this.
    const rawBody = request.rawBody?.toString('utf8') ?? '';
    const result = await this.payments.handleWebhook(
      provider,
      rawBody,
      signature,
      request.correlationId ?? 'unavailable',
    );
    return { data: result, meta: { correlationId: request.correlationId ?? 'unavailable' } };
  }
}
