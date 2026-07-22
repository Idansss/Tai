/**
 * The one piece of maths that places a print on a garment.
 *
 * The approved print *zone* (registry.ts) plus the customer's free adjustment (scale, and an
 * offset expressed as percentage points of the garment viewBox) resolve to a box in the garment's
 * own 400×460 coordinate space. Every surface that has to agree on where the artwork sits — the
 * SVG <GarmentMockup>, the photographic <ShirtPhotoMockup> (which reuses the mockup's print layer),
 * and the interactive <PlacementCanvas> overlay in the Studio — derives that box from this single
 * function, so the preview, the drag handles and the saved geometry can never drift apart.
 */

import { GARMENT_VIEWBOX, type PrintZone } from './registry';

/** A resolved print box in garment viewBox units (centre + size). */
export interface PrintBox {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export interface PrintAdjustment {
  /** Fraction of the zone's max size the print is drawn at (approved preset × free resize). */
  scale?: number;
  /** Free-placement offset of the print centre from the zone centre, in viewBox percentage points. */
  dxPct?: number;
  dyPct?: number;
}

/**
 * Resolve a print zone + free adjustment to a box in viewBox units. Artwork is *contained* in this
 * box (never stretched), so its own proportions are always preserved.
 */
export function printBox(
  zone: PrintZone,
  { scale = 1, dxPct = 0, dyPct = 0 }: PrintAdjustment = {},
  viewBox: { w: number; h: number } = GARMENT_VIEWBOX,
): PrintBox {
  return {
    centerX: zone.cx + (dxPct / 100) * viewBox.w,
    centerY: zone.cy + (dyPct / 100) * viewBox.h,
    width: zone.maxW * scale,
    height: zone.maxH * scale,
  };
}

/** The same box expressed as CSS percentages of the viewBox — the form an absolutely-positioned
 * print layer needs (left/top of the box's top-left corner, and its width/height). */
export interface PrintBoxPercent {
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
}

export function printBoxPercent(
  zone: PrintZone,
  adjustment: PrintAdjustment = {},
  viewBox: { w: number; h: number } = GARMENT_VIEWBOX,
): PrintBoxPercent {
  const box = printBox(zone, adjustment, viewBox);
  return {
    leftPct: ((box.centerX - box.width / 2) / viewBox.w) * 100,
    topPct: ((box.centerY - box.height / 2) / viewBox.h) * 100,
    widthPct: (box.width / viewBox.w) * 100,
    heightPct: (box.height / viewBox.h) * 100,
  };
}
