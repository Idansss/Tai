import type { StoryBlock, StoryHotspotTarget } from './data/types';

/**
 * Pure domain logic for shoppable stories (TMS-F5-007). Given an authored
 * hotspot target, these derive the destination href and the call-to-action
 * label, and count the shoppable items in a story. Pure + unit-tested so the
 * routing/labelling never drifts between the index, the card, and the scene.
 */

/** The catalogue URL a hotspot links to. */
export function hotspotHref(target: StoryHotspotTarget): string {
  switch (target.kind) {
    case 'artwork':
      return `/artworks/${target.slug}`;
    case 'product':
      return `/products/${target.slug}`;
    case 'collection':
      return `/collections/${target.slug}`;
    case 'studio':
      return '/design-studio';
  }
}

/** The call-to-action label for a hotspot's link. */
export function hotspotActionLabel(target: StoryHotspotTarget): string {
  switch (target.kind) {
    case 'artwork':
      return 'View artwork';
    case 'product':
      return 'Shop this piece';
    case 'collection':
      return 'Explore collection';
    case 'studio':
      return 'Open in Studio';
  }
}

/** A short kind label, e.g. for a hotspot's eyebrow. */
export function hotspotKindLabel(target: StoryHotspotTarget): string {
  switch (target.kind) {
    case 'artwork':
      return 'Artwork';
    case 'product':
      return 'Product';
    case 'collection':
      return 'Collection';
    case 'studio':
      return 'Design Studio';
  }
}

/** Whether a hotspot points at something you can buy/design (artwork or product). */
export function isShoppable(target: StoryHotspotTarget): boolean {
  return target.kind === 'artwork' || target.kind === 'product';
}

/** All hotspot targets across a story's scene blocks, in document order. */
export function storyHotspotTargets(blocks: StoryBlock[]): StoryHotspotTarget[] {
  return blocks.flatMap((block) =>
    block.kind === 'scene' ? block.scene.hotspots.map((h) => h.target) : [],
  );
}

/** Count of shoppable (artwork/product) hotspots across a story. */
export function countShoppableItems(blocks: StoryBlock[]): number {
  return storyHotspotTargets(blocks).filter(isShoppable).length;
}
