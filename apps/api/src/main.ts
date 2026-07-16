import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { loadEnvironment } from '@tms/configuration';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { ApiExceptionFilter } from './platform/api-exception.filter.js';
import { resolveCorrelationId } from './platform/correlation-id.js';

const environment = loadEnvironment();
const app = await NestFactory.create(AppModule, { bufferLogs: true });

app.useLogger(app.get(Logger));
app.use(helmet());
app.use((request: Request, response: Response, next: NextFunction) => {
  const correlationId = resolveCorrelationId(request.header('x-correlation-id'));
  request.correlationId = correlationId;
  response.setHeader('x-correlation-id', correlationId);
  next();
});
app.useGlobalPipes(
  new ValidationPipe({
    forbidNonWhitelisted: true,
    transform: true,
    whitelist: true,
  }),
);
app.useGlobalFilters(new ApiExceptionFilter());
app.setGlobalPrefix('api/v1');

const openApiConfig = new DocumentBuilder()
  .setTitle('Tai Manic Studios API')
  .setDescription('Versioned backend contract for storefront and administration clients.')
  .setVersion('1.0.0')
  .addCookieAuth('tms_session', { type: 'apiKey', in: 'cookie' }, 'tms_session')
  .addCookieAuth('tms_admin_session', { type: 'apiKey', in: 'cookie' }, 'tms_admin_session')
  .build();
const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);
SwaggerModule.setup('api/docs', app, openApiDocument, { jsonDocumentUrl: 'api/docs/openapi.json' });

await app.listen(environment.API_PORT);
