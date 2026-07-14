import { describe, expect, it } from 'vitest';

import { resolveCorrelationId } from './correlation-id.js';

describe('resolveCorrelationId', () => {
  it('preserves a safe caller-provided identifier', () => {
    expect(resolveCorrelationId('checkout:request-123', () => 'generated')).toBe(
      'checkout:request-123',
    );
  });

  it('replaces missing, oversized, or unsafe identifiers', () => {
    const generate = () => 'generated';

    expect(resolveCorrelationId(undefined, generate)).toBe('generated');
    expect(resolveCorrelationId('a'.repeat(129), generate)).toBe('generated');
    expect(resolveCorrelationId('unsafe\r\nheader', generate)).toBe('generated');
  });
});
