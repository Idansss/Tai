/**
 * Cart domain logic — pure and framework-free so it can be unit-tested and
 * shared between the cart drawer, the cart page and (later) checkout.
 *
 * Money is authoritative on the server (see MASTER_PRODUCT_SPEC §"server is
 * authoritative for … price, discounts, tax, shipping, and totals"). Until the
 * cart/checkout APIs exist, these helpers compute an honest *preview* subtotal
 * and a *preview* promotion discount; delivery and tax are deliberately left to
 * checkout. Backend gap tracked as TMS-FBR-003 in FRONTEND_TO_BACKEND.md.
 */

export interface CartItem {
  /** Stable line id — identical configurations merge into one line. */
  id: string;
  /** Slug of the product this line represents (used for the default link). */
  productSlug: string;
  /** Where the line links to; defaults to the product page when omitted. */
  href?: string;
  artworkTitle: string;
  garment: string;
  colour: string;
  size: string;
  /** Unit price in minor units (e.g. kobo). Server-authoritative later. */
  priceMinor: number;
  currency: string;
  quantity: number;
  /** Optional Design Studio provenance, shown as line detail. */
  placement?: string;
  scale?: string;
  view?: string;
}

/** A configuration a caller wants to add — everything but the derived id. */
export type CartItemInput = Omit<CartItem, 'id' | 'quantity'> & { quantity?: number };

export const MAX_LINE_QUANTITY = 20;

/**
 * Derive a stable line id from the fields that make a configuration unique.
 * Two adds with the same product/colour/size/placement/scale merge quantities.
 */
export function lineId(input: {
  productSlug: string;
  colour: string;
  size: string;
  placement?: string;
  scale?: string;
}): string {
  return [input.productSlug, input.colour, input.size, input.placement ?? '', input.scale ?? '']
    .map((part) => part.trim().toLowerCase().replace(/\s+/g, '-'))
    .join('__');
}

function clampQuantity(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.round(n)));
}

/** Add a configuration to the cart, merging quantities into any matching line. */
export function addItem(items: CartItem[], input: CartItemInput): CartItem[] {
  const id = lineId(input);
  const qty = clampQuantity(input.quantity ?? 1);
  const existing = items.find((i) => i.id === id);
  if (existing) {
    return items.map((i) =>
      i.id === id ? { ...i, quantity: clampQuantity(i.quantity + qty) } : i,
    );
  }
  return [...items, { ...input, id, quantity: qty }];
}

/** Set a line's quantity; a quantity of 0 or less removes the line. */
export function setQuantity(items: CartItem[], id: string, quantity: number): CartItem[] {
  if (quantity <= 0) return removeItem(items, id);
  return items.map((i) => (i.id === id ? { ...i, quantity: clampQuantity(quantity) } : i));
}

export function removeItem(items: CartItem[], id: string): CartItem[] {
  return items.filter((i) => i.id !== id);
}

/** Total number of garments in the cart (for the header badge). */
export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

/** Preview subtotal in minor units. Checkout re-computes authoritatively. */
export function subtotalMinor(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.priceMinor * i.quantity, 0);
}

// --- Promotions (preview only) -------------------------------------------------

export type PromoKind = 'percent' | 'fixed';

export interface Promotion {
  code: string;
  label: string;
  kind: PromoKind;
  /** Percent (0–100) for `percent`; minor units for `fixed`. */
  value: number;
}

/** Mock promotion codes. The server validates and applies real promos later. */
const PROMOTIONS: Record<string, Promotion> = {
  STUDIO10: { code: 'STUDIO10', label: '10% off', kind: 'percent', value: 10 },
  WELCOME: { code: 'WELCOME', label: '₦1,500 off', kind: 'fixed', value: 150000 },
};

/** Look up a promotion by (case-insensitive) code, or null if unknown. */
export function resolvePromotion(code: string): Promotion | null {
  return PROMOTIONS[code.trim().toUpperCase()] ?? null;
}

/** Preview discount in minor units, never exceeding the subtotal. */
export function discountMinor(subtotal: number, promo: Promotion | null): number {
  if (!promo || subtotal <= 0) return 0;
  const raw = promo.kind === 'percent' ? Math.round((subtotal * promo.value) / 100) : promo.value;
  return Math.min(subtotal, Math.max(0, raw));
}

/** Preview total after any promotion (delivery + tax are added at checkout). */
export function estimatedTotalMinor(items: CartItem[], promo: Promotion | null): number {
  const subtotal = subtotalMinor(items);
  return subtotal - discountMinor(subtotal, promo);
}
