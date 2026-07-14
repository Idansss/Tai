import { describe, expect, it } from 'vitest';

import { DesignConfigurationInputSchema, ErrorCodeSchema, PaginationQuerySchema } from './index.js';

describe('shared contracts', () => {
  it('normalises a bounded pagination query', () => {
    expect(PaginationQuerySchema.parse({ limit: '25' })).toEqual({ limit: 25 });
  });

  it('rejects unknown public error codes', () => {
    expect(ErrorCodeSchema.safeParse('SQL_ERROR').success).toBe(false);
  });

  it('requires identifiers for a design configuration', () => {
    expect(DesignConfigurationInputSchema.safeParse({}).success).toBe(false);
  });
});
