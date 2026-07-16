import { HttpException } from '@nestjs/common';
import type { ErrorCode } from '@tms/contracts';

export class ApiProblemException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    status: number,
    message: string,
  ) {
    super(message, status);
  }
}
