import { describe, expect, it } from 'vitest';
import {
  type CartItem,
  type CartItemInput,
  addItem,
  cartCount,
  discountMinor,
  estimatedTotalMinor,
  lineId,
  MAX_LINE_QUANTITY,
  removeItem,
  resolvePromotion,
  setQuantity,
  subtotalMinor,
} from './cart';

const base: CartItemInput = {
  productSlug: 'midnight-in-lagos-classic-tee',
  artworkTitle: 'Midnight in Lagos',
  garment: 'Classic T-shirt',
  colour: 'Black',
  size: 'M',
  priceMinor: 1200000,
  currency: 'NGN',
};

/** Find a line by its derived id (keeps tests off raw index access). */
function line(items: CartItem[], input: Parameters<typeof lineId>[0]): CartItem | undefined {
  return items.find((i) => i.id === lineId(input));
}

describe('lineId', () => {
  it('is stable and normalised for the same configuration', () => {
    expect(lineId(base)).toBe(lineId({ ...base, colour: ' black ', size: 'm' }));
  });

  it('differs when placement or scale differ', () => {
    expect(lineId({ ...base, placement: 'centre-chest' })).not.toBe(
      lineId({ ...base, placement: 'left-chest' }),
    );
  });

  it('forks the line when the printed sides differ (front-only vs both sides)', () => {
    const frontOnly = { ...base, designSides: { front: { printScale: 0.4, placementId: 'p-fc' } } };
    const bothSides = {
      ...base,
      designSides: {
        front: { printScale: 0.4, placementId: 'p-fc' },
        back: { printScale: 0.6, placementId: 'p-bk' },
      },
    };
    expect(lineId(frontOnly)).not.toBe(lineId(bothSides));
    // The same two-sided composition merges.
    expect(lineId(bothSides)).toBe(lineId({ ...bothSides }));
  });

  it('forks the line for a different note, and merges an identical one', () => {
    expect(lineId({ ...base, note: 'For mum' })).not.toBe(lineId(base));
    expect(lineId({ ...base, note: 'For mum' })).toBe(lineId({ ...base, note: ' for mum ' }));
  });

  it('keeps a plain line id when the note is empty', () => {
    expect(lineId({ ...base, note: '   ' })).toBe(lineId(base));
  });
});

describe('addItem', () => {
  it('appends a new line with quantity defaulting to 1', () => {
    const items = addItem([], base);
    expect(items).toHaveLength(1);
    expect(line(items, base)?.quantity).toBe(1);
  });

  it('merges quantities for an identical configuration', () => {
    const items = addItem(addItem([], { ...base, quantity: 2 }), { ...base, quantity: 3 });
    expect(items).toHaveLength(1);
    expect(line(items, base)?.quantity).toBe(5);
  });

  it('keeps distinct sizes as separate lines', () => {
    const items = addItem(addItem([], base), { ...base, size: 'L' });
    expect(items).toHaveLength(2);
  });

  it('clamps quantity to the per-line maximum', () => {
    const items = addItem([], { ...base, quantity: 999 });
    expect(line(items, base)?.quantity).toBe(MAX_LINE_QUANTITY);
  });
});

describe('setQuantity / removeItem', () => {
  const id = lineId(base);
  const seeded = addItem([], { ...base, quantity: 2 });

  it('updates a line quantity', () => {
    expect(line(setQuantity(seeded, id, 4), base)?.quantity).toBe(4);
  });

  it('removes a line when quantity drops to zero', () => {
    expect(setQuantity(seeded, id, 0)).toHaveLength(0);
  });

  it('removeItem drops the matching line only', () => {
    const two = addItem(seeded, { ...base, size: 'L' });
    expect(removeItem(two, id)).toHaveLength(1);
  });
});

describe('totals', () => {
  const items = addItem(addItem([], { ...base, quantity: 2 }), { ...base, size: 'L' });

  it('counts every garment', () => {
    expect(cartCount(items)).toBe(3);
  });

  it('sums the subtotal in minor units', () => {
    expect(subtotalMinor(items)).toBe(1200000 * 3);
  });
});

describe('promotions', () => {
  it('resolves known codes case-insensitively', () => {
    expect(resolvePromotion('studio10')?.code).toBe('STUDIO10');
    expect(resolvePromotion('  welcome ')?.code).toBe('WELCOME');
  });

  it('returns null for unknown codes', () => {
    expect(resolvePromotion('NOPE')).toBeNull();
  });

  it('applies a percentage discount', () => {
    expect(discountMinor(1000000, resolvePromotion('STUDIO10'))).toBe(100000);
  });

  it('applies a fixed discount but never exceeds the subtotal', () => {
    expect(discountMinor(100000, resolvePromotion('WELCOME'))).toBe(100000);
    expect(discountMinor(500000, resolvePromotion('WELCOME'))).toBe(150000);
  });

  it('estimated total nets off the discount', () => {
    const items = addItem([], { ...base, quantity: 1 });
    expect(estimatedTotalMinor(items, resolvePromotion('STUDIO10'))).toBe(1080000);
  });
});
