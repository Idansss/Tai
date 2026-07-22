import type { ConciergeCitation } from '@tms/contracts';
import { apiFetch, ApiNetworkError, ApiRequestError } from '../../data/http';

interface OrderListItem {
  reference: string;
  status: string;
  placedAt: string;
  total?: { amountMinor: number; currency: string };
}

/**
 * Authenticated order list. Ownership is enforced by the API session cookie.
 * Never accepts a customerId filter from the model.
 */
export async function getCustomerOrdersTool(cookie?: string): Promise<{
  ok: boolean;
  text: string;
  citations: ConciergeCitation[];
}> {
  try {
    const orders = await apiFetch<OrderListItem[]>('/api/v1/orders', {
      cache: 'no-store',
      ...(cookie ? { cookie } : {}),
    });
    if (!orders.length) {
      return {
        ok: true,
        text: 'I do not see any orders on this signed-in account yet.',
        citations: [
          {
            kind: 'support',
            label: 'Your orders',
            description: 'Account orders',
            href: '/account/orders',
          },
        ],
      };
    }
    const lines = orders
      .slice(0, 5)
      .map((o) => `• ${o.reference} — ${o.status.replaceAll('_', ' ').toLowerCase()}`)
      .join('\n');
    return {
      ok: true,
      text: `Here are recent orders on your account:\n${lines}\nStatuses come from the order service — I will not invent tracking or dispatch dates.`,
      citations: [
        {
          kind: 'support',
          label: 'Your orders',
          description: 'Full order history',
          href: '/account/orders',
        },
      ],
    };
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      return {
        ok: false,
        text: 'Sign in to look up orders on your account. For guest orders, use the order confirmation email or contact the studio with your reference — I will not search other customers’ orders.',
        citations: [
          { kind: 'support', label: 'Sign in', description: 'Access your orders', href: '/login' },
          { kind: 'support', label: 'Contact', description: 'Studio support', href: '/contact' },
        ],
      };
    }
    if (error instanceof ApiNetworkError || error instanceof ApiRequestError) {
      return {
        ok: false,
        text: 'I could not reach the order service. Please try again, check Your orders, or contact the studio.',
        citations: [
          {
            kind: 'support',
            label: 'Your orders',
            description: 'Account orders',
            href: '/account/orders',
          },
          { kind: 'support', label: 'Contact', description: 'Studio support', href: '/contact' },
        ],
      };
    }
    throw error;
  }
}

export async function getOrderStatusTool(
  reference: string,
  cookie?: string,
): Promise<{ ok: boolean; text: string; citations: ConciergeCitation[] }> {
  const ref = reference.trim().toUpperCase();
  if (!/^[A-Z0-9-]{6,32}$/.test(ref)) {
    return {
      ok: false,
      text: 'Please share a valid order reference from your confirmation email.',
      citations: [
        {
          kind: 'support',
          label: 'Your orders',
          description: 'Find references',
          href: '/account/orders',
        },
      ],
    };
  }
  try {
    const order = await apiFetch<{ reference: string; status: string }>(
      `/api/v1/orders/${encodeURIComponent(ref)}`,
      { cache: 'no-store', ...(cookie ? { cookie } : {}) },
    );
    return {
      ok: true,
      text: `Order ${order.reference} is currently ${order.status.replaceAll('_', ' ').toLowerCase()}. I only report statuses returned by the order service.`,
      citations: [
        {
          kind: 'support',
          label: `Order ${order.reference}`,
          description: 'Order detail',
          href: `/account/orders/${encodeURIComponent(order.reference)}`,
        },
      ],
    };
  } catch (error) {
    if (error instanceof ApiRequestError && (error.status === 404 || error.status === 401)) {
      // Same response shape whether missing or not owned — no enumeration.
      return {
        ok: false,
        text: 'I could not find an order with that reference for this account. Double-check the reference or contact the studio.',
        citations: [
          {
            kind: 'support',
            label: 'Your orders',
            description: 'Account orders',
            href: '/account/orders',
          },
          { kind: 'support', label: 'Contact', description: 'Studio support', href: '/contact' },
        ],
      };
    }
    return {
      ok: false,
      text: 'Order lookup failed. Please try again or contact the studio — I will not invent a status.',
      citations: [
        { kind: 'support', label: 'Contact', description: 'Studio support', href: '/contact' },
      ],
    };
  }
}
