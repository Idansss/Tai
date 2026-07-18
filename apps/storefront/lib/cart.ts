/**
 * Cart domain logic — pure and framework-free so it can be unit-tested and
 * shared between the cart drawer, the cart page and (later) checkout.
 *
 * Money is authoritative on the server (see MASTER_PRODUCT_SPEC §"server is
 * authoritative for … price, discounts, tax, shipping, and totals"). The helpers
 * here compute an honest *preview* subtotal and a *preview* promotion discount for
 * optimistic UI only; delivery and tax belong to checkout. Once a cart is
 * server-backed, the cart page must render the server's numbers, not these —
 * see `lib/cart-api.ts`.
 */
import { configurationCanonicalForm, type GarmentView } from '@tms/contracts';
import { type PrintTransform, transformKey } from './studio';

/**
 * The approved tuple that identifies a configuration. Quantity is absent on purpose (ADR-014).
 */
export interface ApprovedConfiguration {
  artworkVersionId: string;
  garmentVariantId: string;
  placementId: string;
  scalePresetId: string;
  view: GarmentView;
}

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
  /**
   * The approved tuple, when the line came from the Studio. Present so the line's identity is
   * the contract's canonical form, and so a server-backed add can post the tuple without having
   * to reconstruct it from labels.
   */
  configuration?: ApprovedConfiguration;
  /**
   * The free-placement transform (drag/resize/rotate/crop) when the Studio line carries one. It is
   * part of the line's identity — two lines with the same approved tuple but different geometry are
   * different pieces — and a server-backed add will post it alongside the tuple once the API takes
   * free geometry (the approved-tuple canonical form has no room for it).
   */
  transform?: PrintTransform;
}

/** A configuration a caller wants to add — everything but the derived id. */
export type CartItemInput = Omit<CartItem, 'id' | 'quantity'> & { quantity?: number };

export const MAX_LINE_QUANTITY = 20;

/**
 * Derive a stable line id from the fields that make a configuration unique, so two adds of the
 * same configuration merge quantities instead of making a second line.
 *
 * When the caller holds the approved tuple this delegates to `configurationCanonicalForm` from
 * `@tms/contracts` — the backend's single definition of a configuration's identity, which a saved
 * design and a cart line must agree on. Re-deriving that rule here would be a second definition
 * free to drift from it. Quantity is deliberately excluded (ADR-014): it is cart state, not part
 * of what the customer made, so changing it must not fork the line.
 *
 * The slug fallback serves the local preview cart, where a line was built from catalogue slugs
 * and no approved ids exist yet.
 */
export function lineId(input: {
  productSlug: string;
  colour: string;
  size: string;
  placement?: string;
  scale?: string;
  configuration?: ApprovedConfiguration;
  transform?: PrintTransform;
}): string {
  // A free transform forks the line: same approved tuple, different composition → different piece.
  // Suffixed (empty for the identity transform) so a plain approved add keeps its canonical id.
  const suffix = input.transform ? transformKey(input.transform) : '';
  const geom = suffix ? `##${suffix}` : '';
  if (input.configuration) return configurationCanonicalForm(input.configuration) + geom;
  return (
    [input.productSlug, input.colour, input.size, input.placement ?? '', input.scale ?? '']
      .map((part) => part.trim().toLowerCase().replace(/\s+/g, '-'))
      .join('__') + geom
  );
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
