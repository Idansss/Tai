import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { ApiErrorResponse, ErrorCode } from '@tms/contracts';
import type { Request, Response } from 'express';

import { ApiProblemException } from './api-problem.exception.js';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const code = exception instanceof ApiProblemException ? exception.code : this.codeFor(status);
    if (status >= 500) {
      this.logger.error({
        correlationId: request.correlationId ?? 'unavailable',
        exception: exception instanceof Error ? { name: exception.name } : { name: 'UnknownError' },
      });
    }
    const body: ApiErrorResponse = {
      error: {
        code,
        message: status >= 500 ? 'An unexpected error occurred.' : this.safeMessage(exception),
        correlationId: request.correlationId ?? 'unavailable',
      },
    };

    response.status(status).json(body);
  }

  private safeMessage(exception: unknown): string {
    if (!(exception instanceof HttpException)) return 'An unexpected error occurred.';
    const response = exception.getResponse();
    if (typeof response === 'string') return response;
    if (typeof response === 'object' && response !== null && 'message' in response) {
      const message = response.message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return 'The request failed validation.';
    }
    return 'The request could not be completed.';
  }

  private codeFor(status: number): ErrorCode {
    if (status === HttpStatus.UNAUTHORIZED) return 'AUTHENTICATION_REQUIRED';
    if (status === HttpStatus.FORBIDDEN) return 'PERMISSION_DENIED';
    if (status === HttpStatus.NOT_FOUND) return 'RESOURCE_NOT_FOUND';
    if (status === HttpStatus.CONFLICT) return 'CONFLICT';
    if (status === HttpStatus.TOO_MANY_REQUESTS) return 'RATE_LIMITED';
    if (status >= 400 && status < 500) return 'VALIDATION_FAILED';
    return 'INTERNAL_ERROR';
  }
}
