/**
 * The server-backed cart.
 *
 * Rules the backend has fixed, encoded here so no caller can get them wrong:
 *
 * - **Never send a price.** `POST /cart/items` takes the approved tuple plus a quantity;
 *   including `unitPriceMinor` is a 400. Money is resolved server-side from the approved
 *   artwork+garment pair on every read (ADR-015). `AddCartItemInput` has nowhere to put one.
 * - **Totals come from the server.** `lib/cart.ts`'s preview helpers stay for optimistic UI, but
 *   the cart page renders `cart.subtotal` / `cart.total`.
 * - **Anonymous carts work with no session.** The API issues a `tms_cart` guest cookie, so every
 *   call goes through `apiFetch` with `credentials:'include'`. Signing in auto-merges the guest
 *   cart on the next cart read — there is no merge call to make.
 * - **Unavailable lines are kept, not dropped.** A line carries an `issue`; those lines are
 *   excluded from the subtotal server-side and must render as "no longer available" with the
 *   reason. `cart.hasIssues` blocks checkout.
 * - **Nothing is reserved by the cart** (ADR-017). `availableQuantity` is what is sellable now,
 *   not what is held for this shopper, so there is no hold and no countdown to show.
 */
import type { AddCartLineInput, Cart, CartLineIssue, UpdateCartLineInput } from '@tms/contracts';

import { apiFetch } from './data/http';

/**
 * What a caller may add: the contract's own input type, imported rather than redeclared.
 *
 * This is the approved tuple plus a quantity and deliberately nothing else, so a price cannot be
 * sent even by accident. Using the contract's type means its rules (quantity 1–20, the
 * `scalePreset` slug) are enforced here by the same definition the server validates against,
 * instead of a local copy free to drift.
 */
export type AddCartItemInput = AddCartLineInput;

/**
 * Whether the cart is server-backed.
 *
 * Server-only: it reads the same `DATA_SOURCE` flag as the catalogue rather than introducing a
 * `NEXT_PUBLIC_` twin, so there is one switch for "is there an API" and no way for the two to
 * disagree. The root layout reads this and passes it to the client provider.
 */
export function isCartServerBacked(): boolean {
  return process.env.DATA_SOURCE === 'api';
}

/** Read the current cart. Creates a guest cart server-side when there is no session. */
export function fetchCart(cookie?: string): Promise<Cart> {
  // Never cached: totals, availability and issues are resolved fresh on every read.
  return apiFetch<Cart>('/api/v1/cart', { cache: 'no-store', ...(cookie ? { cookie } : {}) });
}

export function addCartItem(input: AddCartItemInput): Promise<Cart> {
  return apiFetch<Cart>('/api/v1/cart/items', { method: 'POST', body: input });
}

export function updateCartItemQuantity(
  lineId: string,
  quantity: UpdateCartLineInput['quantity'],
): Promise<Cart> {
  return apiFetch<Cart>(`/api/v1/cart/items/${encodeURIComponent(lineId)}`, {
    method: 'PATCH',
    body: { quantity } satisfies UpdateCartLineInput,
  });
}

export function removeCartItem(lineId: string): Promise<Cart> {
  return apiFetch<Cart>(`/api/v1/cart/items/${encodeURIComponent(lineId)}`, { method: 'DELETE' });
}

export function applyPromotion(code: string): Promise<Cart> {
  return apiFetch<Cart>('/api/v1/cart/promotion', { method: 'POST', body: { code } });
}

export function removePromotion(): Promise<Cart> {
  return apiFetch<Cart>('/api/v1/cart/promotion', { method: 'DELETE' });
}

/**
 * Why a line cannot be bought, in the customer's words.
 *
 * `OUT_OF_STOCK` and `INSUFFICIENT_STOCK` are genuinely different situations — "none left" versus
 * "fewer left than you asked for" — so they read differently. Everything else describes the
 * catalogue withdrawing the sale, which is not the shopper's fault and should not sound like it.
 */
export function cartIssueMessage(issue: CartLineIssue, availableQuantity: number): string {
  switch (issue) {
    case 'OUT_OF_STOCK':
      return 'Out of stock — no longer available.';
    case 'INSUFFICIENT_STOCK':
      return availableQuantity > 0
        ? `Only ${availableQuantity} left — reduce the quantity to continue.`
        : 'Out of stock — no longer available.';
    case 'CONFIGURATION_NOT_APPROVED':
      return 'This combination is no longer offered — no longer available.';
    case 'DROP_NOT_OPEN':
      return 'This drop has not opened yet — no longer available.';
    case 'DROP_ENDED':
      return 'This drop has ended — no longer available.';
    default:
      return 'No longer available.';
  }
}

/**
 * Whether reducing the quantity would make the line buyable again. Only true for
 * INSUFFICIENT_STOCK: for every other issue the configuration itself is unavailable, so offering
 * "reduce quantity" would be a dead end.
 */
export function isRecoverableByQuantity(issue: CartLineIssue | null): boolean {
  return issue === 'INSUFFICIENT_STOCK';
}

/** Lines the customer can actually buy. The server already excludes the rest from the subtotal. */
export function buyableLines(cart: Cart) {
  return cart.items.filter((line) => line.issue === null);
}

/** Lines needing attention, kept in the cart so the customer can see what happened. */
export function unavailableLines(cart: Cart) {
  return cart.items.filter((line) => line.issue !== null);
}
