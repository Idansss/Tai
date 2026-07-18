/**
 * The garment mockup system — single source of truth.
 *
 * Every place the site draws a piece of clothing (product page, Design Studio, cart, saved
 * designs, wishlist) renders the one <GarmentMockup> component against this registry. There are
 * no per-page garment images and no hard-coded colours: a garment is a *style* (a realistic SVG
 * silhouette) recoloured by a *colourway* (a hex), with the artwork printed into an approved
 * print zone. Change a colour or a silhouette here and it changes everywhere at once
 * (requirement 9 of the brief; supersedes the flat-colour-box placeholders the media pipeline —
 * MediaAssetKind.MOCKUP, TMS-B2-004 — was going to fill).
 *
 * The colour values are the same ones the mock catalogue serves (lib/data/mock.ts COLOUR_PALETTE),
 * so a garment on the wall and a garment in the Studio are the same fabric colour.
 */

/** The three silhouettes the catalogue actually sells. */
export type GarmentStyle = 'classic-tee' | 'oversized-tee' | 'long-sleeve';

export type GarmentView = 'front' | 'back';

/** A print zone in the garment's own viewBox coordinates (0..400 x, 0..460 y). */
export interface PrintZone {
  /** Centre of the zone. */
  cx: number;
  cy: number;
  /** Maximum print width/height in viewBox units. Artwork is *contained* in this box — never
   * stretched to fill it — so its own proportions are preserved (requirement 5). */
  maxW: number;
  maxH: number;
}

export interface GarmentDef {
  style: GarmentStyle;
  /** The garment's shared viewBox, so print zones and the silhouette share one coordinate space. */
  viewBox: { w: number; h: number };
  print: Record<GarmentView, PrintZone>;
}

/**
 * The viewBox every silhouette is drawn in. One space for all styles keeps the print maths simple.
 */
export const GARMENT_VIEWBOX = { w: 400, h: 460 } as const;

/**
 * Print zones per style. Front sits on the chest, a touch above centre; back sits high between
 * the shoulder blades — where a screen print actually lands. Oversized runs a little larger and
 * lower to match its boxier body.
 */
export const GARMENTS: Record<GarmentStyle, GarmentDef> = {
  'classic-tee': {
    style: 'classic-tee',
    viewBox: GARMENT_VIEWBOX,
    print: {
      front: { cx: 200, cy: 236, maxW: 150, maxH: 180 },
      back: { cx: 200, cy: 196, maxW: 168, maxH: 196 },
    },
  },
  'oversized-tee': {
    style: 'oversized-tee',
    viewBox: GARMENT_VIEWBOX,
    print: {
      front: { cx: 200, cy: 244, maxW: 170, maxH: 196 },
      back: { cx: 200, cy: 204, maxW: 188, maxH: 210 },
    },
  },
  'long-sleeve': {
    style: 'long-sleeve',
    viewBox: GARMENT_VIEWBOX,
    print: {
      front: { cx: 200, cy: 232, maxW: 146, maxH: 176 },
      back: { cx: 200, cy: 194, maxW: 164, maxH: 192 },
    },
  },
};

/**
 * Map the catalogue's garment *names* (what the data layer and cart carry, e.g. "Oversized
 * T-shirt") to a silhouette. Matching is done on a normalised name so small wording differences
 * don't break it, and anything unrecognised falls back to the classic tee rather than a box.
 */
const NAME_TO_STYLE: { test: (n: string) => boolean; style: GarmentStyle }[] = [
  { test: (n) => n.includes('oversize'), style: 'oversized-tee' },
  { test: (n) => n.includes('long') && n.includes('sleeve'), style: 'long-sleeve' },
  { test: (n) => n.includes('long-sleeve'), style: 'long-sleeve' },
  { test: (n) => n.includes('tee') || n.includes('t-shirt') || n.includes('shirt'), style: 'classic-tee' },
];

export function garmentStyleFromName(name: string | null | undefined): GarmentStyle {
  const n = (name ?? '').toLowerCase();
  return NAME_TO_STYLE.find((r) => r.test(n))?.style ?? 'classic-tee';
}

/**
 * The colourways the catalogue ships. Kept in step with mock.ts COLOUR_PALETTE — the source of
 * truth for *which* colours exist is still the data layer; this is the source of truth for how a
 * given hex is *drawn* as fabric. Any hex works (see resolveColourway), so a new catalogue colour
 * renders correctly without a change here.
 */
export const GARMENT_COLOURWAYS: Record<string, string> = {
  Black: '#1a1a1a',
  Bone: '#efeae0',
  Sand: '#d8c7a8',
  Olive: '#5f6046',
  Slate: '#3a4654',
};

export interface Colourway {
  /** The flat fabric colour. */
  hex: string;
  /** 0 (black) … 1 (white) relative luminance — drives shading + print blend. */
  luminance: number;
  /** True when the fabric is dark enough that a light artwork must sit on it without multiply. */
  isDark: boolean;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Perceptual (sRGB) relative luminance, 0..1. */
export function luminanceOf(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Shift a colour towards white (amount > 0) or black (amount < 0), amount in −1..1. Used to derive
 * a garment's own seam, collar-rib and fold colours from its fabric hex so the shading reads as
 * the same cloth in a different light rather than a printed line.
 */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = amount >= 0 ? 255 : 0;
  const a = Math.abs(amount);
  return toHex([r + (t - r) * a, g + (t - g) * a, b + (t - b) * a]);
}

/**
 * Resolve a colour by *name* (preferred — matches the catalogue) or by a raw hex. Unknown names
 * fall through to a neutral so a garment never renders invisible.
 */
export function resolveColourway(nameOrHex: string | null | undefined): Colourway {
  const key = nameOrHex ?? '';
  const hex = GARMENT_COLOURWAYS[key] ?? (key.startsWith('#') ? key : '#cfcabf');
  const luminance = luminanceOf(hex);
  return { hex, luminance, isDark: luminance < 0.4 };
}
