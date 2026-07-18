/**
 * Turning a server cart into something a person can read.
 *
 * A `CartLine` is entirely identifiers — `artworkId`, `garmentTemplateId`, `garmentVariantId`,
 * `placementId`, `scalePresetId` — and carries no title, garment name, colour, size or image. So
 * the cart response alone cannot render "Midnight in Lagos on a Black Classic T-shirt, size M".
 * The names have to be joined in from the catalogue.
 *
 * This is an **interim** layer. The right fix is a display projection on the cart line itself
 * (TMS-FBR-020 in FRONTEND_TO_BACKEND.md); until then we build the lookup from `/artworks` and
 * `/garments`, which is two requests for the whole cart rather than five per line. Delete this
 * the day the cart line carries its own labels.
 *
 * Everything here is pure so the join is unit-testable without a server. Money is passed through
 * untouched: the server's numbers are the numbers.
 */
import type { Artwork, Cart, CartLine, GarmentTemplate } from '@tms/contracts';

import type { CartItem, Promotion } from './cart';
import { discountMinor, estimatedTotalMinor, subtotalMinor } from './cart';
import type { PrintTransform } from './studio';

export interface CartLineView {
  /** The server's line id — what PATCH/DELETE address. */
  id: string;
  artworkTitle: string;
  artworkSlug: string | null;
  garment: string;
  colour: string;
  size: string;
  placement: string;
  scale: string;
  view: string;
  quantity: number;
  /**
   * The bits needed to redraw the exact piece as a thumbnail: which side the print is on, its base
   * width as a fraction of the print zone, the free transform, and a customer note. Absent on lines
   * with no design (or a server cart that doesn't carry geometry yet), which fall back gracefully.
   */
  printView?: 'front' | 'back';
  printScale?: number;
  transform?: PrintTransform;
  note?: string;
  /** Server-resolved. Null when the server could not price the line. */
  unitPriceMinor: number | null;
  lineTotalMinor: number | null;
  currency: string;
  /**
   * Sellable now — not held for this shopper (ADR-017). Null when the source cannot say, which
   * is the local preview cart: it has no stock knowledge and must not imply any.
   */
  availableQuantity: number | null;
  issue: CartLine['issue'];
  href: string | null;
}

export interface CartView {
  lines: CartLineView[];
  /** Garment count across every line, including unavailable ones. */
  count: number;
  /** The server's subtotal. Unavailable lines are already excluded from it. */
  subtotalMinor: number;
  totalMinor: number;
  currency: string;
  promotion: { code: string; label: string; discountMinor: number } | null;
  hasIssues: boolean;
}

/** The catalogue lookups a cart needs, keyed the way a cart line refers to them. */
export interface CartLabelIndex {
  artworksById: Map<string, Artwork>;
  garmentsById: Map<string, GarmentTemplate>;
}

export function buildCartLabelIndex(
  artworks: Artwork[],
  garments: GarmentTemplate[],
): CartLabelIndex {
  return {
    artworksById: new Map(artworks.map((artwork) => [artwork.id, artwork])),
    garmentsById: new Map(garments.map((garment) => [garment.id, garment])),
  };
}

/**
 * A label we could not resolve. Shown rather than hiding the line: the customer still has
 * something in their cart, and a line that silently vanishes is worse than one that reads
 * "Unknown". An unresolved label means our lookup is stale, never that the line is invalid.
 */
const UNKNOWN = 'Unknown';

function viewLabel(view: CartLine['view']): string {
  return view.charAt(0) + view.slice(1).toLowerCase();
}

export function toCartLineView(line: CartLine, index: CartLabelIndex): CartLineView {
  const artwork = index.artworksById.get(line.artworkId) ?? null;
  const garment = index.garmentsById.get(line.garmentTemplateId) ?? null;
  const variant = garment?.variants.find((entry) => entry.id === line.garmentVariantId) ?? null;
  const colour = garment?.colours.find((entry) => entry.id === variant?.colourId) ?? null;
  const size = garment?.sizes.find((entry) => entry.id === variant?.sizeId) ?? null;
  const placement = garment?.placements.find((entry) => entry.id === line.placementId) ?? null;
  // A line stores the preset's id, while the Studio sends its slug (TMS-FBR-017), so match
  // either rather than showing "Unknown" over a naming mismatch.
  const preset =
    placement?.scalePresets.find(
      (entry) => entry.id === line.scalePresetId || entry.slug === line.scalePresetId,
    ) ?? null;

  return {
    id: line.lineId,
    artworkTitle: artwork?.publishedVersion?.title ?? UNKNOWN,
    artworkSlug: artwork?.slug ?? null,
    garment: garment?.title ?? UNKNOWN,
    colour: colour?.name ?? UNKNOWN,
    size: size?.label ?? UNKNOWN,
    placement: placement?.name ?? UNKNOWN,
    scale: preset?.name ?? UNKNOWN,
    view: viewLabel(line.view),
    quantity: line.quantity,
    // The server cart carries the print side; free geometry + notes arrive with TMS-FBR-020.
    printView: line.view === 'BACK' ? 'back' : 'front',
    unitPriceMinor: line.unitPrice?.amountMinor ?? null,
    lineTotalMinor: line.lineTotal?.amountMinor ?? null,
    currency: line.unitPrice?.currency ?? line.lineTotal?.currency ?? '',
    availableQuantity: line.availableQuantity,
    issue: line.issue,
    href: artwork ? `/artworks/${artwork.slug}` : null,
  };
}

/**
 * Project a server cart for rendering.
 *
 * The totals are the server's, verbatim. `lib/cart.ts` has preview helpers that compute a
 * subtotal locally, and they must not be used here: the server already excluded unavailable
 * lines from its subtotal, and a second opinion about money is a bug waiting to happen.
 */
export function toCartView(cart: Cart, index: CartLabelIndex): CartView {
  return {
    lines: cart.items.map((line) => toCartLineView(line, index)),
    count: cart.items.reduce((sum, line) => sum + line.quantity, 0),
    subtotalMinor: cart.subtotal.amountMinor,
    totalMinor: cart.total.amountMinor,
    currency: cart.currency,
    promotion: cart.promotion
      ? {
          code: cart.promotion.code,
          label: cart.promotion.label,
          discountMinor: cart.promotion.discount.amountMinor,
        }
      : null,
    hasIssues: cart.hasIssues,
  };
}

/**
 * Project the local preview cart into the same view the server cart produces, so the cart
 * components render one shape and never branch on where the cart came from.
 *
 * The honest limits of this cart are encoded rather than papered over: it knows no stock, so
 * `availableQuantity` is null and `issue` is always null — it cannot discover that something
 * became unavailable. Its totals are a local estimate, which is exactly why a server-backed cart
 * must not use them.
 */
export function toLocalCartView(items: CartItem[], promotion: Promotion | null): CartView {
  const subtotal = subtotalMinor(items);
  return {
    lines: items.map((item) => ({
      id: item.id,
      artworkTitle: item.artworkTitle,
      artworkSlug: item.artworkSlug ?? null,
      garment: item.garment,
      colour: item.colour,
      size: item.size,
      placement: item.placement ?? '',
      scale: item.scale ?? '',
      view: item.view ?? '',
      quantity: item.quantity,
      printView: item.printView,
      printScale: item.printScale,
      transform: item.transform,
      note: item.note,
      unitPriceMinor: item.priceMinor,
      lineTotalMinor: item.priceMinor * item.quantity,
      currency: item.currency,
      availableQuantity: null,
      issue: null,
      href: item.href ?? `/products/${item.productSlug}`,
    })),
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalMinor: subtotal,
    totalMinor: estimatedTotalMinor(items, promotion),
    currency: items[0]?.currency ?? 'NGN',
    promotion: promotion
      ? {
          code: promotion.code,
          label: promotion.label,
          discountMinor: discountMinor(subtotal, promotion),
        }
      : null,
    // A local cart has no way to know a configuration went unavailable.
    hasIssues: false,
  };
}
