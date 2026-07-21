import type { ConciergeCitation } from '@tms/contracts';
import { addCartItem, fetchCart, isCartServerBacked, type AddCartItemInput } from '../../cart-api';

export async function getCartTool(cookie?: string): Promise<{
  ok: boolean;
  text: string;
  citations: ConciergeCitation[];
}> {
  if (!isCartServerBacked()) {
    return {
      ok: false,
      text: 'I can see a local preview bag in this environment, but live bag totals and availability come from the server cart when the API is connected. Open your bag to review selections.',
      citations: [
        { kind: 'catalogue', label: 'Your bag', description: 'Review items', href: '/cart' },
      ],
    };
  }
  try {
    const cart = await fetchCart(cookie);
    const count = cart.items.reduce((n, line) => n + line.quantity, 0);
    return {
      ok: true,
      text: `Your bag has ${count} item${count === 1 ? '' : 's'}. Subtotal is resolved server-side — I will not invent a price. ${cart.hasIssues ? 'Some lines have availability issues and are excluded from checkout until fixed.' : 'No availability issues reported on the last read.'}`,
      citations: [
        { kind: 'catalogue', label: 'Your bag', description: 'Review and edit', href: '/cart' },
      ],
    };
  } catch {
    return {
      ok: false,
      text: 'I could not reach the bag service just now. Please open your bag or try again.',
      citations: [
        { kind: 'catalogue', label: 'Your bag', description: 'Review items', href: '/cart' },
        { kind: 'support', label: 'Contact', description: 'Studio support', href: '/contact' },
      ],
    };
  }
}

/**
 * Only mutates the cart when the caller supplies a complete approved tuple.
 * Never substitutes size/colour/artwork silently. Never sends a price.
 */
export async function addToCartTool(input: AddCartItemInput): Promise<{
  ok: boolean;
  text: string;
  citations: ConciergeCitation[];
}> {
  if (!isCartServerBacked()) {
    return {
      ok: false,
      text: 'I cannot add to a live bag while the catalogue is in preview mode. Open the product or Design Studio to add it yourself.',
      citations: [
        {
          kind: 'studio',
          label: 'Design Studio',
          description: 'Build and add',
          href: '/design-studio',
        },
        { kind: 'catalogue', label: 'Shop', description: 'Browse products', href: '/shop' },
      ],
    };
  }
  try {
    await addCartItem(input);
    return {
      ok: true,
      text: 'Added to your bag. Open the bag to confirm sizes and quantities before checkout.',
      citations: [
        {
          kind: 'catalogue',
          label: 'Your bag',
          description: 'Confirm the addition',
          href: '/cart',
        },
      ],
    };
  } catch {
    return {
      ok: false,
      text: 'I could not add that item. The combination may be unavailable, or the bag service failed. Nothing was claimed as added.',
      citations: [
        { kind: 'catalogue', label: 'Your bag', description: 'Check current bag', href: '/cart' },
        { kind: 'support', label: 'Contact', description: 'Need help?', href: '/contact' },
      ],
    };
  }
}
