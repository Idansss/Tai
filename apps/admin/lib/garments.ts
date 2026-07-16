/**
 * Pure garment-manager helpers, status presentation, the catalogue lifecycle,
 * and inventory maths (stock levels, low-stock counting, variant edits).
 * Framework-free so they can be unit-tested and shared by the list and detail
 * surfaces.
 */

import type {
  AdminGarmentSummary,
  GarmentColour,
  GarmentStatus,
  GarmentVariant,
} from './data/types';
import type { StatusTone } from './order-status';

// --- Currency ------------------------------------------------------------------

/** Format minor units (kobo) as Naira for display, e.g. 1_200_000 → "₦12,000". */
export function formatNaira(minor: number): string {
  return `₦${Math.round(minor / 100).toLocaleString('en-NG')}`;
}

// --- Status presentation -------------------------------------------------------

const STATUS_LABEL: Record<GarmentStatus, string> = {
  active: 'Active',
  draft: 'Draft',
  archived: 'Archived',
};

export function formatGarmentStatus(status: GarmentStatus): string {
  return STATUS_LABEL[status];
}

export function garmentStatusTone(status: GarmentStatus): StatusTone {
  switch (status) {
    case 'active':
      return 'success';
    case 'draft':
      return 'info';
    case 'archived':
      return 'error';
    default:
      return 'neutral';
  }
}

// --- Search / filter -----------------------------------------------------------

export function filterGarments(
  garments: AdminGarmentSummary[],
  opts: { query?: string; status?: GarmentStatus | 'all' } = {},
): AdminGarmentSummary[] {
  const q = (opts.query ?? '').trim().toLowerCase();
  const status = opts.status ?? 'all';
  return garments.filter((g) => {
    const matchesQuery =
      !q || g.name.toLowerCase().includes(q) || g.template.toLowerCase().includes(q);
    return matchesQuery && (status === 'all' || g.status === status);
  });
}

// --- Lifecycle -----------------------------------------------------------------

export type GarmentAction = 'activate' | 'archive' | 'restore' | 'draft';

export interface GarmentActionSpec {
  id: GarmentAction;
  label: string;
  primary?: boolean;
}

/** The lifecycle actions available from a given status. */
export function garmentActions(status: GarmentStatus): GarmentActionSpec[] {
  switch (status) {
    case 'draft':
      return [
        { id: 'activate', label: 'Activate', primary: true },
        { id: 'archive', label: 'Archive' },
      ];
    case 'active':
      return [
        { id: 'draft', label: 'Move to draft' },
        { id: 'archive', label: 'Archive' },
      ];
    case 'archived':
      return [{ id: 'restore', label: 'Restore', primary: true }];
    default:
      return [];
  }
}

/** Apply a lifecycle action, returning the resulting status (unchanged if invalid). */
export function applyGarmentAction(status: GarmentStatus, action: GarmentAction): GarmentStatus {
  const allowed = garmentActions(status).some((a) => a.id === action);
  if (!allowed) return status;
  switch (action) {
    case 'activate':
      return 'active';
    case 'archive':
      return 'archived';
    case 'draft':
    case 'restore':
      return 'draft';
    default:
      return status;
  }
}

// --- Inventory -----------------------------------------------------------------

/** Variants at or below this on-hand count are flagged for restock. */
export const LOW_STOCK_THRESHOLD = 6;

export type StockLevel = 'out' | 'low' | 'ok';

export function stockLevel(stock: number): StockLevel {
  if (stock <= 0) return 'out';
  if (stock <= LOW_STOCK_THRESHOLD) return 'low';
  return 'ok';
}

export function stockLevelTone(level: StockLevel): StatusTone {
  switch (level) {
    case 'out':
      return 'error';
    case 'low':
      return 'warning';
    default:
      return 'success';
  }
}

export function stockLevelLabel(level: StockLevel): string {
  switch (level) {
    case 'out':
      return 'Out of stock';
    case 'low':
      return 'Low stock';
    default:
      return 'In stock';
  }
}

/** Stable key for a colour×size variant. */
export function variantKey(colourId: string, size: string): string {
  return `${colourId}::${size}`;
}

export function findVariant(
  variants: GarmentVariant[],
  colourId: string,
  size: string,
): GarmentVariant | undefined {
  return variants.find((v) => v.colourId === colourId && v.size === size);
}

/** Total on-hand units across every variant. */
export function totalStock(variants: GarmentVariant[]): number {
  return variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0);
}

/**
 * Count variants that need attention (out or low), restricted to colours that
 * are actually offered, so a discontinued colourway never inflates the count.
 */
export function countLowStock(variants: GarmentVariant[], colours: GarmentColour[]): number {
  const offered = new Set(colours.filter((c) => c.available).map((c) => c.id));
  return variants.filter((v) => offered.has(v.colourId) && v.stock <= LOW_STOCK_THRESHOLD).length;
}

/** Set a variant's stock (clamped to ≥ 0), returning a new array. */
export function setVariantStock(
  variants: GarmentVariant[],
  colourId: string,
  size: string,
  stock: number,
): GarmentVariant[] {
  const next = Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0;
  return variants.map((v) =>
    v.colourId === colourId && v.size === size ? { ...v, stock: next } : v,
  );
}

/** Toggle whether a colourway is offered, returning a new array. */
export function setColourAvailability(
  colours: GarmentColour[],
  id: string,
  available: boolean,
): GarmentColour[] {
  return colours.map((c) => (c.id === id ? { ...c, available } : c));
}
