import { describe, expect, it } from 'vitest';
import {
  canGenerate,
  CONTENT_TYPES,
  type ContentType,
  contentTypeLabel,
  draftFromVariant,
  type GenerationInput,
  generateVariants,
  MODEL_NAME,
} from './storyteller';

const NOW = Date.parse('2026-07-16T12:00:00.000Z');

function input(overrides: Partial<GenerationInput> = {}): GenerationInput {
  return {
    sourceKind: 'artwork',
    sourceId: 'a1',
    sourceTitle: 'Midnight in Lagos',
    contentType: 'product_description',
    ...overrides,
  };
}

describe('content types', () => {
  it('labels every content type', () => {
    for (const type of CONTENT_TYPES) {
      expect(contentTypeLabel(type.id)).toBe(type.label);
    }
  });
});

describe('canGenerate', () => {
  it('requires a source and a content type', () => {
    expect(canGenerate({})).toBe(false);
    expect(canGenerate({ sourceId: 'a1', sourceTitle: 'X' })).toBe(false);
    expect(canGenerate(input())).toBe(true);
  });
});

describe('generateVariants', () => {
  it('produces multiple distinct variants that mention the source and carry metadata', () => {
    const variants = generateVariants(input(), NOW);
    expect(variants.length).toBeGreaterThan(1);
    expect(new Set(variants.map((v) => v.text)).size).toBe(variants.length);
    for (const v of variants) {
      expect(v.text).toContain('Midnight in Lagos');
      expect(v.meta.model).toBe(MODEL_NAME);
      expect(v.meta.variantCount).toBe(variants.length);
      expect(Number.isNaN(Date.parse(v.meta.createdAt))).toBe(false);
    }
  });

  it('is deterministic for the same input + clock (same batch id)', () => {
    const a = generateVariants(input(), NOW);
    const b = generateVariants(input(), NOW);
    expect(a.map((v) => v.id)).toEqual(b.map((v) => v.id));
    expect(a[0]?.meta.batchId).toBe(b[0]?.meta.batchId);
  });

  it('varies output by content type', () => {
    const desc = generateVariants(input({ contentType: 'product_description' }), NOW);
    const social = generateVariants(input({ contentType: 'social_caption' }), NOW);
    expect(desc[0]?.text).not.toBe(social[0]?.text);
  });

  it('appends an operator brief when provided', () => {
    const variants = generateVariants(input({ brief: 'Mention the neon.' }), NOW);
    expect(variants[0]?.text).toContain('Mention the neon.');
  });

  it('covers every content type without throwing', () => {
    const types: ContentType[] = [
      'product_description',
      'social_caption',
      'collection_intro',
      'email_teaser',
    ];
    for (const contentType of types) {
      expect(generateVariants(input({ contentType }), NOW).length).toBeGreaterThan(0);
    }
  });
});

describe('draftFromVariant', () => {
  it('always produces a draft — never a published status', () => {
    const [variant] = generateVariants(input(), NOW);
    const draft = draftFromVariant(variant!, input(), variant!.text, NOW);
    expect(draft.status).toBe('draft');
    expect(draft.edited).toBe(false);
  });

  it('marks the draft as edited when the text was changed', () => {
    const [variant] = generateVariants(input(), NOW);
    const draft = draftFromVariant(variant!, input(), `${variant!.text} (tweaked)`, NOW);
    expect(draft.edited).toBe(true);
    expect(draft.status).toBe('draft');
  });
});
