import { describe, expect, it } from 'vitest';

import { HealthService } from './health.service.js';

describe('HealthService', () => {
  it('returns a deterministic healthy snapshot', () => {
    const service = new HealthService();

    expect(service.getSnapshot(new Date('2026-07-14T12:00:00.000Z'))).toEqual({
      status: 'ok',
      service: 'api',
      timestamp: '2026-07-14T12:00:00.000Z',
    });
  });
});
