import { describe, expect, it } from 'vitest';
import type { AdminErrorEntry } from './data/types';
import {
  applyErrorAction,
  errorActions,
  filterErrors,
  formatErrorSource,
  formatResolution,
  isUnresolved,
  openCount,
  severityTone,
} from './errors';

function err(over: Partial<AdminErrorEntry>): AdminErrorEntry {
  return {
    id: 'e1',
    correlationId: 'corr-abc123',
    source: 'payment',
    severity: 'error',
    resolution: 'open',
    message: 'Payment verification timed out',
    occurredAt: '2026-07-15T09:00:00.000Z',
    affectedOrder: 'TMS-5HWEUR',
    retryable: true,
    ...over,
  };
}

describe('presentation', () => {
  it('labels sources and resolutions readably', () => {
    expect(formatErrorSource('image_processing')).toBe('Image processing');
    expect(formatErrorSource('background_job')).toBe('Background job');
    expect(formatResolution('retrying')).toBe('Retrying');
  });
  it('tones critical/error as error, warning as warning', () => {
    expect(severityTone('critical')).toBe('error');
    expect(severityTone('error')).toBe('error');
    expect(severityTone('warning')).toBe('warning');
  });
});

describe('isUnresolved + openCount', () => {
  it('treats open/investigating/retrying as unresolved', () => {
    expect(isUnresolved('open')).toBe(true);
    expect(isUnresolved('investigating')).toBe(true);
    expect(isUnresolved('retrying')).toBe(true);
    expect(isUnresolved('resolved')).toBe(false);
    expect(isUnresolved('ignored')).toBe(false);
  });
  it('counts only unresolved entries', () => {
    const list = [
      err({ resolution: 'open' }),
      err({ resolution: 'investigating' }),
      err({ resolution: 'resolved' }),
      err({ resolution: 'ignored' }),
    ];
    expect(openCount(list)).toBe(2);
  });
});

describe('filterErrors', () => {
  const list = [
    err({ id: '1', source: 'payment', resolution: 'open', correlationId: 'corr-pay-1' }),
    err({ id: '2', source: 'webhook', resolution: 'resolved', correlationId: 'corr-hook-2' }),
    err({
      id: '3',
      source: 'email',
      resolution: 'open',
      affectedOrder: 'TMS-ZZ0001',
      correlationId: 'corr-3',
    }),
  ];
  it('filters by source and resolution', () => {
    expect(filterErrors(list, { source: 'webhook' }).map((e) => e.id)).toEqual(['2']);
    expect(filterErrors(list, { resolution: 'open' }).map((e) => e.id)).toEqual(['1', '3']);
  });
  it('searches correlation id and affected order', () => {
    expect(filterErrors(list, { query: 'hook-2' }).map((e) => e.id)).toEqual(['2']);
    expect(filterErrors(list, { query: 'tms-zz0001' }).map((e) => e.id)).toEqual(['3']);
  });
});

describe('errorActions + applyErrorAction', () => {
  it('offers retry only when retryable', () => {
    expect(
      errorActions(err({ resolution: 'open', retryable: true })).some((a) => a.id === 'retry'),
    ).toBe(true);
    expect(
      errorActions(err({ resolution: 'open', retryable: false })).some((a) => a.id === 'retry'),
    ).toBe(false);
  });
  it('transitions through the lifecycle', () => {
    expect(applyErrorAction(err({ resolution: 'open' }), 'investigate')).toBe('investigating');
    expect(applyErrorAction(err({ resolution: 'open', retryable: true }), 'retry')).toBe(
      'retrying',
    );
    expect(applyErrorAction(err({ resolution: 'investigating' }), 'resolve')).toBe('resolved');
    expect(applyErrorAction(err({ resolution: 'resolved' }), 'reopen')).toBe('open');
  });
  it('ignores actions not offered from the current state', () => {
    // retry not offered on a non-retryable entry
    expect(applyErrorAction(err({ resolution: 'open', retryable: false }), 'retry')).toBe('open');
    // resolved only offers reopen
    expect(applyErrorAction(err({ resolution: 'resolved' }), 'investigate')).toBe('resolved');
  });
});
