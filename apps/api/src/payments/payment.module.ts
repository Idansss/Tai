import { Module } from '@nestjs/common';
import { loadEnvironment } from '@tms/configuration';

import { DatabaseService } from '../database/database.service.js';
import { OrderModule } from '../orders/order.module.js';
import { FlutterwavePaymentProvider } from './flutterwave-payment-provider.js';
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
          flutterwave: {
            baseUrl: environment.FLUTTERWAVE_BASE_URL,
            secretKey: environment.FLUTTERWAVE_SECRET_KEY ?? '',
            webhookHash: environment.FLUTTERWAVE_WEBHOOK_HASH ?? '',
          },
        };
      },
    },
    {
      provide: PAYMENT_PROVIDER,
      inject: [PAYMENT_CONFIG],
      useFactory: (config: PaymentConfig): PaymentProvider => {
        // The gateway is selected by config. Configuration validation guarantees the Flutterwave
        // credentials are present whenever it is the chosen provider.
        if (config.provider === 'flutterwave') {
          return new FlutterwavePaymentProvider({
            baseUrl: config.flutterwave.baseUrl,
            secretKey: config.flutterwave.secretKey,
            webhookHash: config.flutterwave.webhookHash,
            appPublicUrl: config.appPublicUrl,
          });
        }
        return new MockPaymentProvider(config.mockWebhookSecret, config.appPublicUrl);
      },
    },
  ],
  exports: [PaymentService, PAYMENT_PROVIDER],
})
export class PaymentModule {}
