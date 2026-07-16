import { describe, expect, it } from 'vitest';
import {
  addSavedDesign,
  addWishlistItem,
  designSignature,
  findOrder,
  hasWishlisted,
  patchOrder,
  removeSavedDesign,
  removeWishlistItem,
  type SavedDesign,
  sortOrdersByDate,
  toggleWishlistItem,
  upsertOrder,
  type WishlistItem,
} from './account';
import type { PlacedOrder } from './order';
import { EMPTY_STUDIO_CONFIG, type StudioConfig } from './studio';

function design(id: string, config: Partial<StudioConfig> = {}): SavedDesign {
  return {
    id,
    config: { ...EMPTY_STUDIO_CONFIG, ...config },
    artworkTitle: 'Midnight in Lagos',
    priceMinor: 1800000,
    currency: 'NGN',
    savedAt: '2026-07-15T10:00:00.000Z',
  };
}

function wish(slug: string): WishlistItem {
  return {
    slug,
    title: 'Midnight in Lagos',
    garment: 'Heavy tee',
    collection: 'Night Studies',
    priceMinor: 1800000,
    currency: 'NGN',
    addedAt: '2026-07-15T10:00:00.000Z',
  };
}

function order(reference: string, placedAt: string): PlacedOrder {
  return {
    reference,
    placedAt,
    currency: 'NGN',
    items: [],
    contact: { email: 'buyer@example.com', phone: '08030000000' },
    delivery: {
      fullName: 'Ada Buyer',
      addressLine1: '1 Studio Way',
      addressLine2: '',
      city: 'Lagos',
      state: 'Lagos',
      deliveryOptionId: 'standard',
    },
    deliveryOptionLabel: 'Standard',
    deliveryEta: '2–4 days',
    paymentMethod: 'card',
    totals: {
      subtotalMinor: 1800000,
      discountMinor: 0,
      deliveryMinor: 0,
      taxMinor: 135000,
      totalMinor: 1935000,
    },
    status: 'PAID',
    paymentStatus: 'SUCCEEDED',
  };
}

describe('designSignature', () => {
  it('is stable and case-insensitive for the same configuration', () => {
    const a = designSignature({ ...EMPTY_STUDIO_CONFIG, artwork: 'Lagos', colour: 'Black' });
    const b = designSignature({ ...EMPTY_STUDIO_CONFIG, artwork: 'lagos', colour: 'black' });
    expect(a).toBe(b);
  });

  it('differs when a choice changes', () => {
    const a = designSignature({ ...EMPTY_STUDIO_CONFIG, colour: 'Black' });
    const b = designSignature({ ...EMPTY_STUDIO_CONFIG, colour: 'Bone' });
    expect(a).not.toBe(b);
  });
});

describe('saved designs', () => {
  it('adds newest first and de-duplicates by id', () => {
    let list: SavedDesign[] = [];
    list = addSavedDesign(list, design('a'));
    list = addSavedDesign(list, design('b'));
    expect(list.map((d) => d.id)).toEqual(['b', 'a']);
    // re-saving the same id replaces, staying single and moving to front
    list = addSavedDesign(list, { ...design('a'), artworkTitle: 'Updated' });
    expect(list.map((d) => d.id)).toEqual(['a', 'b']);
    expect(list).toHaveLength(2);
  });

  it('removes by id', () => {
    const list = [design('a'), design('b')];
    expect(removeSavedDesign(list, 'a').map((d) => d.id)).toEqual(['b']);
  });
});

describe('wishlist', () => {
  it('adds without duplicating a slug', () => {
    let list: WishlistItem[] = [];
    list = addWishlistItem(list, wish('lagos'));
    list = addWishlistItem(list, wish('lagos'));
    expect(list).toHaveLength(1);
  });

  it('reports membership', () => {
    const list = [wish('lagos')];
    expect(hasWishlisted(list, 'lagos')).toBe(true);
    expect(hasWishlisted(list, 'other')).toBe(false);
  });

  it('toggles membership', () => {
    let list: WishlistItem[] = [];
    list = toggleWishlistItem(list, wish('lagos'));
    expect(hasWishlisted(list, 'lagos')).toBe(true);
    list = toggleWishlistItem(list, wish('lagos'));
    expect(hasWishlisted(list, 'lagos')).toBe(false);
  });

  it('removes by slug', () => {
    const list = [wish('a'), wish('b')];
    expect(removeWishlistItem(list, 'a').map((i) => i.slug)).toEqual(['b']);
  });
});

describe('order history', () => {
  it('sorts most recent first', () => {
    const list = [
      order('OLD', '2026-01-01T00:00:00.000Z'),
      order('NEW', '2026-07-01T00:00:00.000Z'),
    ];
    expect(sortOrdersByDate(list).map((o) => o.reference)).toEqual(['NEW', 'OLD']);
  });

  it('upserts by reference, keeping one entry newest-first', () => {
    let list: PlacedOrder[] = [];
    list = upsertOrder(list, order('A', '2026-01-01T00:00:00.000Z'));
    list = upsertOrder(list, order('B', '2026-07-01T00:00:00.000Z'));
    expect(list.map((o) => o.reference)).toEqual(['B', 'A']);
    // re-upsert A with a status change → still 2 entries
    list = upsertOrder(list, { ...order('A', '2026-01-01T00:00:00.000Z'), status: 'SHIPPED' });
    expect(list).toHaveLength(2);
    expect(findOrder(list, 'A')?.status).toBe('SHIPPED');
  });

  it('patches only the matching order', () => {
    const list = [order('A', '2026-01-01T00:00:00.000Z'), order('B', '2026-07-01T00:00:00.000Z')];
    const patched = patchOrder(list, 'A', { status: 'PAYMENT_FAILED' });
    expect(findOrder(patched, 'A')?.status).toBe('PAYMENT_FAILED');
    expect(findOrder(patched, 'B')?.status).toBe('PAID');
  });
});
