import type { DeliveryMethod, DeliveryOption } from '@tms/contracts';
import { DeliveryMethod as DeliveryMethodId } from '@tms/database';

/**
 * Server-authoritative delivery pricing and Nigerian VAT. This is a deliberately small, fixed
 * catalogue: a real shipping provider with live rates arrives in TMS-B5-003 and replaces
 * {@link deliveryOptionsFor} without changing the checkout contract. Fees are integer minor units
 * (kobo). Lagos is a distinct, cheaper zone; every other state is nationwide.
 */

/** VAT as a per-mille rate so the tax is computed by integer arithmetic, never a float. */
export const VAT_RATE_PER_MILLE = 75; // 7.5%

type Zone = 'LAGOS' | 'NATIONWIDE';

interface ZoneRate {
  feeMinor: number;
  etaDays: { min: number; max: number };
}

interface MethodDefinition {
  id: DeliveryMethodId;
  label: string;
  description: string;
  zones: Record<Zone, ZoneRate>;
}

const METHODS: readonly MethodDefinition[] = [
  {
    id: DeliveryMethodId.STANDARD,
    label: 'Standard delivery',
    description: 'Tracked courier delivery.',
    zones: {
      LAGOS: { feeMinor: 150_000, etaDays: { min: 2, max: 4 } },
      NATIONWIDE: { feeMinor: 350_000, etaDays: { min: 4, max: 8 } },
    },
  },
  {
    id: DeliveryMethodId.EXPRESS,
    label: 'Express delivery',
    description: 'Priority courier delivery.',
    zones: {
      LAGOS: { feeMinor: 300_000, etaDays: { min: 1, max: 2 } },
      NATIONWIDE: { feeMinor: 600_000, etaDays: { min: 2, max: 4 } },
    },
  },
];

function zoneFor(state: string): Zone {
  return state.trim().toLowerCase() === 'lagos' ? 'LAGOS' : 'NATIONWIDE';
}

export function deliveryOptionsFor(state: string, currency: string): DeliveryOption[] {
  const zone = zoneFor(state);
  return METHODS.map((method) => ({
    id: method.id,
    label: method.label,
    description: method.description,
    etaDays: method.zones[zone].etaDays,
    price: { amountMinor: method.zones[zone].feeMinor, currency },
  }));
}

/** The chosen option for a destination. The DTO enum guarantees the method exists. */
export function resolveDeliveryOption(
  methodId: DeliveryMethodId,
  state: string,
  currency: string,
): DeliveryOption {
  const option = deliveryOptionsFor(state, currency).find((candidate) => candidate.id === methodId);
  // The DTO restricts the method to the enum, so this is defensive rather than reachable.
  if (!option) throw new Error(`Unknown delivery method ${methodId}.`);
  return option;
}

export function deliveryMethodOf(option: DeliveryOption): DeliveryMethod {
  return {
    id: option.id,
    label: option.label,
    description: option.description,
    etaDays: option.etaDays,
  };
}

/** VAT on the taxable amount, in integer minor units, rounded to the nearest kobo. */
export function taxMinorOf(taxableMinor: number): number {
  return Math.round((taxableMinor * VAT_RATE_PER_MILLE) / 1000);
}
