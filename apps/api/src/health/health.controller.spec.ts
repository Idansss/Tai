import type { Request } from 'express';
import { describe, expect, it } from 'vitest';

import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  it('wraps health data in the shared response envelope', () => {
    const controller = new HealthController(new HealthService());
    const request = { correlationId: 'health-test' } as Request;

    expect(controller.liveness(request)).toMatchObject({
      data: { status: 'ok', service: 'api' },
      meta: { correlationId: 'health-test' },
    });
  });
});
