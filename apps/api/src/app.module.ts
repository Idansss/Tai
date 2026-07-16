import { Module } from '@nestjs/common';
import { loadEnvironment } from '@tms/configuration';
import { LoggerModule } from 'nestjs-pino';

import { AdminAuthModule } from './admin-auth/admin-auth.module.js';
import { ArtworkModule } from './artworks/artwork.module.js';
import { CatalogueModule } from './catalogue/catalogue.module.js';
import { AuthModule } from './auth/auth.module.js';
import { HealthController } from './health/health.controller.js';
import { HealthService } from './health/health.service.js';
import { GarmentModule } from './garments/garment.module.js';
import { InventoryModule } from './inventory/inventory.module.js';

@Module({
  imports: [
    AuthModule,
    AdminAuthModule,
    ArtworkModule,
    CatalogueModule,
    GarmentModule,
    InventoryModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: loadEnvironment().LOG_LEVEL,
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
          censor: '[Redacted]',
        },
      },
    }),
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
