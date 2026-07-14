import { describe, expect, it } from 'vitest';

import { buildWorkerRuntimeConfig } from './config.js';

describe('buildWorkerRuntimeConfig', () => {
  it('uses bounded defaults', () => {
    expect(buildWorkerRuntimeConfig({})).toEqual({ concurrency: 5, queuePrefix: 'tms' });
  });

  it('rejects unsafe concurrency', () => {
    expect(() => buildWorkerRuntimeConfig({ WORKER_CONCURRENCY: '0' })).toThrow();
  });
});
