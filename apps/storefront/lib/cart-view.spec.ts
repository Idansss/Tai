import type { Artwork, Cart, CartLine, GarmentTemplate } from '@tms/contracts';
import { describe, expect, it } from 'vitest';

import type { CartItem } from './cart';
import { buildCartLabelIndex, toCartLineView, toCartView, toLocalCartView } from './cart-view';
import { IDENTITY_TRANSFORM } from './studio';

const artwork = {
  id: 'art-1',
  slug: 'market-day',
  status: 'PUBLISHED',
  publishedVersion: { id: 'av1', title: 'Market Day' },
  createdAt: '',
  updatedAt: '',
  publishedAt: '',
  archivedAt: null,
} as unknown as Artwork;

const garment = {
  id: 'tpl-1',
  slug: 'classic-tshirt',
  title: 'Classic T-shirt',
  status: 'PUBLISHED',
  colours: [{ id: 'col-1', name: 'Black', hex: '#000000' }],
  sizes: [{ id: 'sz-1', label: 'M', code: 'M' }],
  variants: [{ id: 'var-1', colourId: 'col-1', sizeId: 'sz-1', sku: 'X' }],
  placements: [
    {
      id: 'pl-1',
      name: 'Centre chest',
      scalePresets: [{ id: 'sp-1', slug: 'medium', name: 'Medium' }],
    },
  ],
} as unknown as GarmentTemplate;

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    lineId: 'l1',
    artworkId: 'art-1',
    artworkVersionId: 'av1',
    garmentTemplateId: 'tpl-1',
    garmentVariantId: 'var-1',
    placementId: 'pl-1',
    scalePresetId: 'sp-1',
    view: 'FRONT',
    quantity: 2,
    unitPrice: { amountMinor: 1400000, currency: 'NGN' },
    lineTotal: { amountMinor: 2800000, currency: 'NGN' },
    availableQuantity: 5,
    issue: null,
    display: {
      artworkTitle: 'Market Day',
      artworkSlug: 'market-day',
      garmentTitle: 'Classic T-shirt',
      colourName: 'Black',
      colourHex: '#000000',
      sizeLabel: 'M',
      placementName: 'Centre chest',
      scaleName: 'Medium',
      thumbnailUrl: null,
    },
    ...overrides,
  };
}

const index = buildCartLabelIndex([artwork], [garment]);

describe('toCartLineView', () => {
  it('joins names onto a line that is nothing but ids', () => {
    expect(toCartLineView(line(), index)).toMatchObject({
      id: 'l1',
      artworkTitle: 'Market Day',
      artworkSlug: 'market-day',
      garment: 'Classic T-shirt',
      colour: 'Black',
      size: 'M',
      placement: 'Centre chest',
      scale: 'Medium',
      view: 'Front',
      href: '/artworks/market-day',
    });
  });

  it("passes the server's money through untouched", () => {
    expect(toCartLineView(line(), index)).toMatchObject({
      unitPriceMinor: 1400000,
      lineTotalMinor: 2800000,
      currency: 'NGN',
    });
  });

  it('resolves a scale preset given by slug as well as by id (TMS-FBR-017)', () => {
    expect(toCartLineView(line({ scalePresetId: 'medium' }), index).scale).toBe('Medium');
  });

  it('keeps a line whose labels will not resolve rather than dropping it', () => {
    const orphan = toCartLineView(line({ artworkId: 'gone', garmentTemplateId: 'gone' }), index);
    expect(orphan.artworkTitle).toBe('Unknown');
    expect(orphan.garment).toBe('Unknown');
    // Still a real line the customer can act on.
    expect(orphan.id).toBe('l1');
    expect(orphan.href).toBeNull();
  });

  it('carries a null price through rather than inventing a zero', () => {
    const unpriced = toCartLineView(line({ unitPrice: null, lineTotal: null }), index);
    expect(unpriced.unitPriceMinor).toBeNull();
    expect(unpriced.lineTotalMinor).toBeNull();
  });
});

describe('toCartView', () => {
  const cart: Cart = {
    id: 'c1',
    currency: 'NGN',
    items: [
      line(),
      line({ lineId: 'l2', issue: 'OUT_OF_STOCK', availableQuantity: 0, quantity: 1 }),
    ],
    subtotal: { amountMinor: 2800000, currency: 'NGN' },
    promotion: {
      code: 'STUDIO10',
      label: '10% off',
      discount: { amountMinor: 280000, currency: 'NGN' },
    },
    total: { amountMinor: 2520000, currency: 'NGN' },
    hasIssues: true,
  };

  it("uses the server's subtotal and total, never a locally recomputed one", () => {
    const view = toCartView(cart, index);
    // The unavailable line is already excluded server-side: 2 x 1,400,000 only.
    expect(view.subtotalMinor).toBe(2800000);
    expect(view.totalMinor).toBe(2520000);
    expect(view.promotion).toEqual({ code: 'STUDIO10', label: '10% off', discountMinor: 280000 });
  });

  it('keeps the unavailable line visible and surfaces hasIssues', () => {
    const view = toCartView(cart, index);
    expect(view.lines).toHaveLength(2);
    expect(view.lines[1]?.issue).toBe('OUT_OF_STOCK');
    expect(view.hasIssues).toBe(true);
  });

  it('counts every garment, including ones that cannot be bought', () => {
    expect(toCartView(cart, index).count).toBe(3);
  });

  it('reports no promotion as null rather than a zero discount', () => {
    expect(toCartView({ ...cart, promotion: null }, index).promotion).toBeNull();
  });
});

describe('toLocalCartView', () => {
  const studioItem: CartItem = {
    id: 'local-1',
    productSlug: 'midnight-in-lagos-studio',
    artworkTitle: 'Midnight in Lagos',
    garment: 'Classic T-shirt',
    colour: 'Black',
    size: 'M',
    priceMinor: 1400000,
    currency: 'NGN',
    quantity: 1,
    artworkSlug: 'midnight-in-lagos',
    printView: 'back',
    printScale: 0.44,
    transform: { ...IDENTITY_TRANSFORM, dx: 8, rotation: 10 },
    note: 'Please centre it a touch higher',
  };

  it('carries the design + note through so the cart can redraw the exact piece', () => {
    const view = toLocalCartView([studioItem], null);
    expect(view.lines[0]).toMatchObject({
      artworkSlug: 'midnight-in-lagos',
      printView: 'back',
      printScale: 0.44,
      transform: { dx: 8, rotation: 10 },
      note: 'Please centre it a touch higher',
    });
  });
});
