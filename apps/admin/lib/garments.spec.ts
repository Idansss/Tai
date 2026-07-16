import { describe, expect, it } from 'vitest';
import type { AdminGarmentSummary, GarmentColour, GarmentVariant } from './data/types';
import {
  applyGarmentAction,
  countLowStock,
  filterGarments,
  formatGarmentStatus,
  formatNaira,
  garmentActions,
  setColourAvailability,
  setVariantStock,
  stockLevel,
  totalStock,
} from './garments';

function garment(over: Partial<AdminGarmentSummary>): AdminGarmentSummary {
  return {
    id: 'g1',
    slug: 'classic-t-shirt',
    name: 'Classic T-shirt',
    template: 'Classic T-shirt',
    status: 'active',
    colourCount: 4,
    sizeCount: 6,
    priceMinor: 1_200_000,
    currency: 'NGN',
    lowStockCount: 1,
    totalStock: 120,
    updatedAt: '2026-07-15T00:00:00.000Z',
    ...over,
  };
}

function variant(colourId: string, size: string, stock: number): GarmentVariant {
  return { colourId, size, stock };
}

function colour(id: string, available: boolean): GarmentColour {
  return { id, name: id, hex: '#000000', available };
}

describe('formatNaira', () => {
  it('formats minor units as Naira', () => {
    expect(formatNaira(1_200_000)).toBe('₦12,000');
    expect(formatNaira(0)).toBe('₦0');
  });
});

describe('formatGarmentStatus', () => {
  it('renders readable labels', () => {
    expect(formatGarmentStatus('active')).toBe('Active');
    expect(formatGarmentStatus('archived')).toBe('Archived');
  });
});

describe('filterGarments', () => {
  const list = [
    garment({ id: '1', name: 'Classic T-shirt', status: 'active' }),
    garment({ id: '2', name: 'Pullover Hoodie', template: 'Hoodie', status: 'draft' }),
    garment({ id: '3', name: 'Studio Cap', template: 'Cap', status: 'archived' }),
  ];
  it('filters by status', () => {
    expect(filterGarments(list, { status: 'draft' }).map((g) => g.id)).toEqual(['2']);
  });
  it('searches name and template', () => {
    expect(filterGarments(list, { query: 'hoodie' }).map((g) => g.id)).toEqual(['2']);
    expect(filterGarments(list, { query: 'cap' }).map((g) => g.id)).toEqual(['3']);
  });
});

describe('garmentActions + applyGarmentAction', () => {
  it('offers activate/archive from draft', () => {
    expect(garmentActions('draft').map((a) => a.id)).toEqual(['activate', 'archive']);
  });
  it('offers draft/archive from active', () => {
    expect(garmentActions('active').map((a) => a.id)).toEqual(['draft', 'archive']);
  });
  it('offers restore from archived', () => {
    expect(garmentActions('archived').map((a) => a.id)).toEqual(['restore']);
  });
  it('transitions correctly', () => {
    expect(applyGarmentAction('draft', 'activate')).toBe('active');
    expect(applyGarmentAction('active', 'archive')).toBe('archived');
    expect(applyGarmentAction('archived', 'restore')).toBe('draft');
    expect(applyGarmentAction('active', 'draft')).toBe('draft');
  });
  it('ignores invalid transitions', () => {
    expect(applyGarmentAction('archived', 'activate')).toBe('archived');
    expect(applyGarmentAction('draft', 'restore')).toBe('draft');
  });
});

describe('stockLevel', () => {
  it('classifies out / low / ok around the threshold', () => {
    expect(stockLevel(0)).toBe('out');
    expect(stockLevel(-3)).toBe('out');
    expect(stockLevel(6)).toBe('low');
    expect(stockLevel(7)).toBe('ok');
  });
});

describe('totalStock', () => {
  it('sums on-hand units and ignores negatives', () => {
    expect(
      totalStock([variant('c1', 'M', 10), variant('c1', 'L', 5), variant('c2', 'M', -2)]),
    ).toBe(15);
  });
});

describe('countLowStock', () => {
  const variants = [variant('c1', 'M', 3), variant('c1', 'L', 20), variant('c2', 'M', 0)];
  it('counts out/low variants for offered colours only', () => {
    const colours = [colour('c1', true), colour('c2', true)];
    expect(countLowStock(variants, colours)).toBe(2); // c1/M (3) + c2/M (0)
  });
  it('ignores variants of unavailable colours', () => {
    const colours = [colour('c1', true), colour('c2', false)];
    expect(countLowStock(variants, colours)).toBe(1); // only c1/M
  });
});

describe('setVariantStock', () => {
  const variants = [variant('c1', 'M', 10), variant('c1', 'L', 5)];
  it('updates the matching variant', () => {
    const next = setVariantStock(variants, 'c1', 'M', 42);
    expect(next.find((v) => v.size === 'M')?.stock).toBe(42);
    expect(next.find((v) => v.size === 'L')?.stock).toBe(5);
  });
  it('clamps to a non-negative integer', () => {
    expect(setVariantStock(variants, 'c1', 'M', -8)[0]?.stock).toBe(0);
    expect(setVariantStock(variants, 'c1', 'M', 3.9)[0]?.stock).toBe(3);
    expect(setVariantStock(variants, 'c1', 'M', Number.NaN)[0]?.stock).toBe(0);
  });
});

describe('setColourAvailability', () => {
  it('toggles a single colour', () => {
    const colours = [colour('c1', true), colour('c2', true)];
    const next = setColourAvailability(colours, 'c2', false);
    expect(next.find((c) => c.id === 'c1')?.available).toBe(true);
    expect(next.find((c) => c.id === 'c2')?.available).toBe(false);
  });
});
