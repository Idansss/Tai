import { Module } from '@nestjs/common';
import { loadEnvironment } from '@tms/configuration';

import { DatabaseService } from '../database/database.service.js';
import { OrderModule } from '../orders/order.module.js';
import { MockPaymentProvider } from './mock-payment-provider.js';
import { PaymentController } from './payment.controller.js';
import {
  PAYMENT_CONFIG,
  PAYMENT_PROVIDER,
  type PaymentConfig,
  type PaymentProvider,
} from './payment-provider.js';
import { PaymentService } from './payment.service.js';
import { PaymentWebhookController } from './payment-webhook.controller.js';

@Module({
  // OrderModule (never the reverse) so payments drive the audited order state machine without a
  // dependency cycle.
  imports: [OrderModule],
  controllers: [PaymentController, PaymentWebhookController],
  providers: [
    DatabaseService,
    PaymentService,
    {
      provide: PAYMENT_CONFIG,
      useFactory: (): PaymentConfig => {
        const environment = loadEnvironment();
        return {
          provider: environment.PAYMENT_PROVIDER,
          mockWebhookSecret: environment.MOCK_PAYMENT_WEBHOOK_SECRET,
          appPublicUrl: environment.APP_PUBLIC_URL,
        };
      },
    },
    {
      provide: PAYMENT_PROVIDER,
      inject: [PAYMENT_CONFIG],
      useFactory: (config: PaymentConfig): PaymentProvider => {
        // Only the mock exists in this task; TMS-B5-002 adds the Flutterwave adapter behind the
        // same port and selects it here by config.
        return new MockPaymentProvider(config.mockWebhookSecret, config.appPublicUrl);
      },
    },
  ],
  exports: [PaymentService, PAYMENT_PROVIDER],
})
export class PaymentModule {}
