/**
 * Account data model for the preview storefront — order history, saved Design
 * Studio configurations, and the wishlist.
 *
 * There is no account/orders API yet (TMS-FBR-004 / TMS-FBR-005), so this
 * models the data **client-side**, scoped per customer email in `localStorage`.
 * Order history is keyed by the order's contact email, so a guest checkout and
 * a later sign-in with the same address see the same orders. Saved designs and
 * the wishlist require a signed-in session.
 *
 * The pure list transforms below are framework-free and unit-tested; the thin
 * read/write wrappers handle persistence. Replace with the real account API
 * on delivery (keep these shapes as the view model).
 */

import type { PlacedOrder } from './order';
import { normalizeEmail } from './auth';
import { collectSides, type StudioConfig, transformKey } from './studio';

// --- Saved designs -------------------------------------------------------------

export interface SavedDesign {
  /** Stable id derived from the configuration signature. */
  id: string;
  config: StudioConfig;
  artworkTitle: string;
  /** Preview swatch colour (hex) for the list card, when known. */
  colourHex?: string;
  priceMinor: number;
  currency: string;
  savedAt: string;
}

/** Configuration signature — identical designs collapse to one saved entry. */
export function designSignature(config: StudioConfig): string {
  // Every printed side is part of what the customer made: two pieces with different sides, or the
  // same sides placed/scaled/cropped differently, are different saved designs — not one.
  const sidesKey = collectSides(config)
    .map((s) => `${s.area}:${s.placement}:${s.scale}:${transformKey(s.transform)}`)
    .join('~');
  return [config.artwork, config.garment, config.colour, config.size, sidesKey]
    .map((part) => (part ?? '').toString().trim().toLowerCase())
    .join('|');
}

/** Add a saved design, replacing any existing entry with the same signature. */
export function addSavedDesign(designs: SavedDesign[], design: SavedDesign): SavedDesign[] {
  const without = designs.filter((d) => d.id !== design.id);
  return [design, ...without];
}

export function removeSavedDesign(designs: SavedDesign[], id: string): SavedDesign[] {
  return designs.filter((d) => d.id !== id);
}

// --- Wishlist ------------------------------------------------------------------

export interface WishlistItem {
  slug: string;
  title: string;
  garment: string;
  collection: string;
  priceMinor: number;
  currency: string;
  addedAt: string;
}

export function hasWishlisted(items: WishlistItem[], slug: string): boolean {
  return items.some((i) => i.slug === slug);
}

/** Add an item to the wishlist unless the slug is already present. */
export function addWishlistItem(items: WishlistItem[], item: WishlistItem): WishlistItem[] {
  if (hasWishlisted(items, item.slug)) return items;
  return [item, ...items];
}

export function removeWishlistItem(items: WishlistItem[], slug: string): WishlistItem[] {
  return items.filter((i) => i.slug !== slug);
}

/** Toggle an item: remove it if present, otherwise add it to the front. */
export function toggleWishlistItem(items: WishlistItem[], item: WishlistItem): WishlistItem[] {
  return hasWishlisted(items, item.slug)
    ? removeWishlistItem(items, item.slug)
    : addWishlistItem(items, item);
}

// --- Order history -------------------------------------------------------------

/** Most-recent-first by placed date. */
export function sortOrdersByDate(orders: PlacedOrder[]): PlacedOrder[] {
  return [...orders].sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}

/** Insert or replace an order (matched by reference), newest first. */
export function upsertOrder(orders: PlacedOrder[], order: PlacedOrder): PlacedOrder[] {
  const without = orders.filter((o) => o.reference !== order.reference);
  return sortOrdersByDate([order, ...without]);
}

/** Apply a patch to the order with `reference`, leaving others untouched. */
export function patchOrder(
  orders: PlacedOrder[],
  reference: string,
  patch: Partial<PlacedOrder>,
): PlacedOrder[] {
  return orders.map((o) => (o.reference === reference ? { ...o, ...patch } : o));
}

export function findOrder(orders: PlacedOrder[], reference: string): PlacedOrder | undefined {
  return orders.find((o) => o.reference === reference);
}

// --- Persistence ---------------------------------------------------------------

const ORDERS_KEY = 'tms.orders.v1';
const SAVED_DESIGNS_KEY = 'tms.savedDesigns.v1';
const WISHLIST_KEY = 'tms.wishlist.v1';

type ByEmail<T> = Record<string, T[]>;

function readMap<T>(key: string): ByEmail<T> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === 'object' ? (parsed as ByEmail<T>) : {};
  } catch {
    return {};
  }
}

function writeList<T>(key: string, email: string, list: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    const map = readMap<T>(key);
    map[normalizeEmail(email)] = list;
    window.localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // storage unavailable — data lives only for this tab
  }
}

function readList<T>(key: string, email: string): T[] {
  const list = readMap<T>(key)[normalizeEmail(email)];
  return Array.isArray(list) ? list : [];
}

// Order history
export function readOrderHistory(email: string): PlacedOrder[] {
  return sortOrdersByDate(readList<PlacedOrder>(ORDERS_KEY, email));
}

/** Record a placed order in the buyer's history (keyed by contact email). */
export function recordOrder(order: PlacedOrder): void {
  const email = order.contact.email;
  writeList(ORDERS_KEY, email, upsertOrder(readList<PlacedOrder>(ORDERS_KEY, email), order));
}

/** Patch a stored order's fields (e.g. status after payment) in history. */
export function updateOrderInHistory(
  email: string,
  reference: string,
  patch: Partial<PlacedOrder>,
): void {
  writeList(
    ORDERS_KEY,
    email,
    patchOrder(readList<PlacedOrder>(ORDERS_KEY, email), reference, patch),
  );
}

export function findOrderInHistory(email: string, reference: string): PlacedOrder | null {
  return findOrder(readOrderHistory(email), reference) ?? null;
}

// Saved designs
export function readSavedDesigns(email: string): SavedDesign[] {
  return readList<SavedDesign>(SAVED_DESIGNS_KEY, email);
}

export function persistSavedDesign(email: string, design: SavedDesign): SavedDesign[] {
  const next = addSavedDesign(readSavedDesigns(email), design);
  writeList(SAVED_DESIGNS_KEY, email, next);
  return next;
}

export function deleteSavedDesign(email: string, id: string): SavedDesign[] {
  const next = removeSavedDesign(readSavedDesigns(email), id);
  writeList(SAVED_DESIGNS_KEY, email, next);
  return next;
}

// Wishlist
export function readWishlist(email: string): WishlistItem[] {
  return readList<WishlistItem>(WISHLIST_KEY, email);
}

export function writeWishlist(email: string, items: WishlistItem[]): void {
  writeList(WISHLIST_KEY, email, items);
}
