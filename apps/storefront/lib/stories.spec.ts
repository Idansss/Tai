import { describe, expect, it } from 'vitest';
import type { StoryBlock, StoryHotspotTarget } from './data/types';
import {
  countShoppableItems,
  hotspotActionLabel,
  hotspotHref,
  hotspotKindLabel,
  isShoppable,
  storyHotspotTargets,
} from './stories';

const artwork: StoryHotspotTarget = {
  kind: 'artwork',
  slug: 'midnight-in-lagos',
  label: 'Midnight in Lagos',
};
const product: StoryHotspotTarget = {
  kind: 'product',
  slug: 'midnight-in-lagos-classic-tee',
  label: 'Midnight in Lagos — Classic T-shirt',
  priceMinor: 1200000,
  currency: 'NGN',
};
const collection: StoryHotspotTarget = {
  kind: 'collection',
  slug: 'night-studies',
  label: 'Night Studies',
};
const studio: StoryHotspotTarget = { kind: 'studio', label: 'Design Studio' };

describe('hotspotHref', () => {
  it('routes each target kind to its catalogue page', () => {
    expect(hotspotHref(artwork)).toBe('/artworks/midnight-in-lagos');
    expect(hotspotHref(product)).toBe('/products/midnight-in-lagos-classic-tee');
    expect(hotspotHref(collection)).toBe('/collections/night-studies');
    expect(hotspotHref(studio)).toBe('/design-studio');
  });
});

describe('hotspotActionLabel / hotspotKindLabel', () => {
  it('gives a distinct CTA per kind', () => {
    expect(hotspotActionLabel(artwork)).toBe('View artwork');
    expect(hotspotActionLabel(product)).toBe('Shop this piece');
    expect(hotspotActionLabel(collection)).toBe('Explore collection');
    expect(hotspotActionLabel(studio)).toBe('Open in Studio');
  });

  it('gives a short kind label per kind', () => {
    expect(hotspotKindLabel(artwork)).toBe('Artwork');
    expect(hotspotKindLabel(product)).toBe('Product');
    expect(hotspotKindLabel(collection)).toBe('Collection');
    expect(hotspotKindLabel(studio)).toBe('Design Studio');
  });
});

describe('isShoppable', () => {
  it('is true only for artwork and product', () => {
    expect(isShoppable(artwork)).toBe(true);
    expect(isShoppable(product)).toBe(true);
    expect(isShoppable(collection)).toBe(false);
    expect(isShoppable(studio)).toBe(false);
  });
});

describe('storyHotspotTargets / countShoppableItems', () => {
  const blocks: StoryBlock[] = [
    { kind: 'heading', text: 'A scene' },
    { kind: 'paragraph', text: 'No hotspots here.' },
    {
      kind: 'scene',
      scene: {
        id: 's1',
        caption: 'Scene one',
        hotspots: [
          { id: 'h1', x: 25, y: 40, caption: 'The artwork', target: artwork },
          { id: 'h2', x: 60, y: 55, caption: 'On a tee', target: product },
        ],
      },
    },
    {
      kind: 'scene',
      scene: {
        id: 's2',
        caption: 'Scene two',
        hotspots: [
          { id: 'h3', x: 50, y: 50, caption: 'The collection', target: collection },
          { id: 'h4', x: 70, y: 30, caption: 'Make your own', target: studio },
        ],
      },
    },
  ];

  it('flattens hotspot targets across scenes in document order', () => {
    expect(storyHotspotTargets(blocks).map((t) => t.kind)).toEqual([
      'artwork',
      'product',
      'collection',
      'studio',
    ]);
  });

  it('counts only shoppable (artwork/product) hotspots', () => {
    expect(countShoppableItems(blocks)).toBe(2);
  });

  it('returns zero for a story with no scenes', () => {
    expect(countShoppableItems([{ kind: 'paragraph', text: 'text only' }])).toBe(0);
  });
});
