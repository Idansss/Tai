import type { Cart } from '@tms/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  addCartItem,
  applyPromotion,
  buyableLines,
  cartIssueMessage,
  isRecoverableByQuantity,
  unavailableLines,
  updateCartItemQuantity,
} from './cart-api';

function line(overrides: Partial<Cart['items'][number]> = {}): Cart['items'][number] {
  return {
    lineId: 'l1',
    artworkId: 'a1',
    artworkVersionId: 'av1',
    garmentTemplateId: 't1',
    garmentVariantId: 'v1',
    placementId: 'p1',
    scalePresetId: 's1',
    view: 'FRONT',
    quantity: 1,
    unitPrice: { amountMinor: 1400000, currency: 'NGN' },
    lineTotal: { amountMinor: 1400000, currency: 'NGN' },
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

function stubCart() {
  const spy = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ data: { items: [] }, meta: { correlationId: 'c1' } }),
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('addCartItem', () => {
  it('posts the approved tuple and quantity, and no price (a price is a 400)', async () => {
    const spy = stubCart();
    await addCartItem({
      artworkVersionId: 'av1',
      garmentVariantId: 'v1',
      placementId: 'p1',
      scalePreset: 'medium',
      view: 'FRONT',
      quantity: 2,
    });
    const body = JSON.parse(String(spy.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({
      artworkVersionId: 'av1',
      garmentVariantId: 'v1',
      placementId: 'p1',
      scalePreset: 'medium',
      view: 'FRONT',
      quantity: 2,
    });
    expect(Object.keys(body)).not.toContain('unitPriceMinor');
    expect(JSON.stringify(body)).not.toMatch(/price/i);
  });

  it('sends cookies so an anonymous shopper keeps their guest cart', async () => {
    const spy = stubCart();
    await addCartItem({
      artworkVersionId: 'av1',
      garmentVariantId: 'v1',
      placementId: 'p1',
      scalePreset: 'medium',
      view: 'FRONT',
      quantity: 1,
    });
    expect(spy.mock.calls[0]?.[1]).toMatchObject({ credentials: 'include' });
  });
});

describe('cart mutations', () => {
  it('PATCHes a quantity to the line, and never a price', async () => {
    const spy = stubCart();
    await updateCartItemQuantity('line 1/2', 3);
    expect(String(spy.mock.calls[0]?.[0])).toContain('/cart/items/line%201%2F2');
    expect(spy.mock.calls[0]?.[1]).toMatchObject({ method: 'PATCH' });
    expect(JSON.parse(String(spy.mock.calls[0]?.[1]?.body))).toEqual({ quantity: 3 });
  });

  it('posts a promotion code as given', async () => {
    const spy = stubCart();
    await applyPromotion('STUDIO10');
    expect(JSON.parse(String(spy.mock.calls[0]?.[1]?.body))).toEqual({ code: 'STUDIO10' });
  });
});

describe('cartIssueMessage', () => {
  it('distinguishes "none left" from "fewer than you asked for"', () => {
    expect(cartIssueMessage('OUT_OF_STOCK', 0)).toMatch(/out of stock/i);
    expect(cartIssueMessage('INSUFFICIENT_STOCK', 2)).toMatch(/only 2 left/i);
  });

  it('does not blame the shopper when the catalogue withdrew the sale', () => {
    expect(cartIssueMessage('CONFIGURATION_NOT_APPROVED', 0)).toMatch(/no longer/i);
    expect(cartIssueMessage('DROP_NOT_OPEN', 0)).toMatch(/not opened yet/i);
    expect(cartIssueMessage('DROP_ENDED', 0)).toMatch(/ended/i);
  });

  it('never promises a hold, because the cart reserves nothing (ADR-017)', () => {
    const messages = (
      [
        'OUT_OF_STOCK',
        'INSUFFICIENT_STOCK',
        'CONFIGURATION_NOT_APPROVED',
        'DROP_NOT_OPEN',
        'DROP_ENDED',
      ] as const
    ).map((issue) => cartIssueMessage(issue, 1));
    expect(messages.join(' ')).not.toMatch(/reserv|held|hold|expires/i);
  });
});

describe('issue partitioning', () => {
  const cart = {
    items: [line(), line({ lineId: 'l2', issue: 'OUT_OF_STOCK', availableQuantity: 0 })],
  } as Cart;

  it('keeps an unavailable line in the cart rather than dropping it', () => {
    expect(cart.items).toHaveLength(2);
    expect(buyableLines(cart).map((l) => l.lineId)).toEqual(['l1']);
    expect(unavailableLines(cart).map((l) => l.lineId)).toEqual(['l2']);
  });

  it('only offers "reduce quantity" where reducing it would actually help', () => {
    expect(isRecoverableByQuantity('INSUFFICIENT_STOCK')).toBe(true);
    expect(isRecoverableByQuantity('OUT_OF_STOCK')).toBe(false);
    expect(isRecoverableByQuantity('DROP_ENDED')).toBe(false);
    expect(isRecoverableByQuantity(null)).toBe(false);
  });
});
