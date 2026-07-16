import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';

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

  it('keeps short health aliases contract-compatible', () => {
    const healthService = new HealthService();
    vi.spyOn(healthService, 'getSnapshot').mockReturnValue({
      status: 'ok',
      service: 'api',
      timestamp: '2026-07-16T00:00:00.000Z',
    });
    const controller = new HealthController(healthService);
    const request = { correlationId: 'health-alias-test' } as Request;

    expect(controller.live(request)).toEqual(controller.liveness(request));
    expect(controller.ready(request)).toEqual(controller.readiness(request));
  });
});
