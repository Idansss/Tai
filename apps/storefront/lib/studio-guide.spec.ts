import { describe, expect, it } from 'vitest';
import { type GuideOutcome, studioGuideRespond } from './studio-guide';

function reply(outcome: GuideOutcome) {
  if (outcome.kind !== 'reply') throw new Error(`expected a reply, got ${outcome.kind}`);
  return outcome.reply;
}

describe('studioGuideRespond — guardrails', () => {
  it('never invents a price and points to the authoritative source', () => {
    const r = reply(studioGuideRespond('how much does the tee cost?'));
    expect(r.guardrail).toBe(true);
    expect(r.text).not.toMatch(/\d/); // no invented numbers
    expect(r.references.some((ref) => ref.href === '/shop')).toBe(true);
  });

  it('does not confirm live stock', () => {
    const r = reply(studioGuideRespond('is the Paper Tigers tee in stock?'));
    expect(r.guardrail).toBe(true);
    expect(r.text.toLowerCase()).toContain('stock');
  });

  it('does not promise a delivery date', () => {
    const r = reply(studioGuideRespond('how long will delivery take?'));
    expect(r.guardrail).toBe(true);
    expect(r.text).not.toMatch(/\d+\s*(day|week)/i);
    expect(r.references.some((ref) => ref.href === '/delivery')).toBe(true);
  });
});

describe('studioGuideRespond — tool failure', () => {
  it('returns a recoverable tool_error for order-status questions', () => {
    const outcome = studioGuideRespond('where is my order?');
    expect(outcome.kind).toBe('tool_error');
    if (outcome.kind === 'tool_error') {
      expect(outcome.tool).toBe('order-lookup');
      expect(outcome.references.some((r) => r.href === '/contact')).toBe(true);
    }
  });
});

describe('studioGuideRespond — topic answers', () => {
  it('routes design questions to the Design Studio', () => {
    const r = reply(studioGuideRespond('how do I design my own piece?'));
    expect(r.guardrail).toBe(false);
    expect(r.references.some((ref) => ref.href === '/design-studio')).toBe(true);
  });

  it('routes size questions to the size guide', () => {
    const r = reply(studioGuideRespond('what size should I get?'));
    expect(r.references.some((ref) => ref.href === '/size-guide')).toBe(true);
  });

  it('routes to a human on a support request', () => {
    const r = reply(studioGuideRespond('can I talk to a person?'));
    expect(r.references.some((ref) => ref.href === '/contact')).toBe(true);
  });

  it('gives a helpful fallback for an unrecognised prompt', () => {
    const r = reply(studioGuideRespond('hello there'));
    expect(r.guardrail).toBe(false);
    expect(r.references.length).toBeGreaterThan(0);
  });
});
