import { HttpException, HttpStatus, Logger, type ArgumentsHost } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiExceptionFilter } from './api-exception.filter.js';

function createHost() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  const request = { correlationId: 'error-test' };
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, response };
}

describe('ApiExceptionFilter', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sanitises unexpected server failures', () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { host, response } = createHost();

    new ApiExceptionFilter().catch(new Error('database password leaked'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
        correlationId: 'error-test',
      },
    });
  });

  it('maps a safe not-found exception without exposing internals', () => {
    const { host, response } = createHost();

    new ApiExceptionFilter().catch(
      new HttpException('Artwork not found.', HttpStatus.NOT_FOUND),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Artwork not found.',
        correlationId: 'error-test',
      },
    });
  });
});
