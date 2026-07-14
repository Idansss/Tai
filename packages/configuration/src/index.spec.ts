import { describe, expect, it } from 'vitest';

import { loadEnvironment } from './index.js';

describe('loadEnvironment', () => {
  it('provides safe local defaults', () => {
    expect(loadEnvironment({})).toEqual({
      NODE_ENV: 'development',
      API_PORT: 4000,
      LOG_LEVEL: 'info',
    });
  });

  it('rejects invalid ports', () => {
    expect(() => loadEnvironment({ API_PORT: '70000' })).toThrow();
  });
});
