import { Module } from '@nestjs/common';
import { loadEnvironment } from '@tms/configuration';
import { LoggerModule } from 'nestjs-pino';

import { AuthModule } from './auth/auth.module.js';
import { HealthController } from './health/health.controller.js';
import { HealthService } from './health/health.service.js';

@Module({
  imports: [
    AuthModule,
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
