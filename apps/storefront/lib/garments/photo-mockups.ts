/**
 * Photographic shirt mockups for the Design Studio.
 *
 * The Studio preview shows a real short-sleeve shirt *photograph* (built from the supplied source
 * renders by scripts/build-shirt-photos.mjs into /public/garments) rather than the SVG silhouette
 * the rest of the storefront draws. This module is the single source of truth for mapping a
 * catalogue colour to its exact front/back photo — no CSS hue recolouring is ever applied to the
 * cloth; each colour is a different photograph.
 *
 * The representative `hex` is the fabric's own mid-tone, used only to (a) pick a fabric-aware print
 * blend (dark vs light cloth) and (b) find the closest photo when an unknown raw hex/name appears.
 * It never tints the photograph.
 */

import { type GarmentView, luminanceOf } from './registry';

export interface PhotoColour {
  /** Asset slug — the /garments/{slug}-{front,back}.webp files. */
  slug: string;
  /** Human label for alt/status text. */
  label: string;
  /** Representative fabric mid-tone. Drives the print blend + closest-match fallback only. */
  hex: string;
  /** Dark enough that a light artwork must print without a multiply blend. */
  isDark: boolean;
  /** Front photograph (the photographed front of the garment). */
  front: string;
  /** Back photograph (the photographed back — a different photo, never a mirror of the front). */
  back: string;
}

function make(slug: string, label: string, hex: string): PhotoColour {
  return {
    slug,
    label,
    hex,
    isDark: luminanceOf(hex) < 0.4,
    front: `/garments/${slug}-front.webp`,
    back: `/garments/${slug}-back.webp`,
  };
}

/**
 * Every supplied photograph, keyed by asset slug. The five catalogue colours (Black, Bone, Sand,
 * Olive, Slate) plus the extra supplied colours, ready for future catalogue data.
 */
export const PHOTO_COLOURS: Record<string, PhotoColour> = {
  red: make('red', 'Red', '#a83a34'),
  black: make('black', 'Black', '#171717'),
  white: make('white', 'White', '#f2f2f0'),
  bone: make('bone', 'Bone', '#ece4d6'),
  brown: make('brown', 'Brown', '#4b3529'),
  navy: make('navy', 'Navy', '#26304a'),
  slate: make('slate', 'Slate', '#3a3d41'),
  olive: make('olive', 'Olive', '#2e4034'),
  burgundy: make('burgundy', 'Burgundy', '#5b2f38'),
  sand: make('sand', 'Sand', '#c7b295'),
};

/** The photo we fall back to when nothing else matches (a neutral, light garment). */
export const FALLBACK_PHOTO_SLUG = 'bone';

/**
 * Catalogue colour *names* (and common synonyms) → photo slug. Matching is case/space-insensitive
 * so small wording differences in future catalogue data still resolve to the right photograph.
 */
const NAME_TO_SLUG: Record<string, string> = {
  red: 'red',
  black: 'black',
  white: 'white',
  bone: 'bone',
  cream: 'bone',
  ivory: 'bone',
  natural: 'bone',
  brown: 'brown',
  chocolate: 'brown',
  mocha: 'brown',
  navy: 'navy',
  'navy blue': 'navy',
  indigo: 'navy',
  slate: 'slate',
  charcoal: 'slate',
  graphite: 'slate',
  grey: 'slate',
  gray: 'slate',
  olive: 'olive',
  green: 'olive',
  forest: 'olive',
  khaki: 'sand',
  burgundy: 'burgundy',
  maroon: 'burgundy',
  wine: 'burgundy',
  sand: 'sand',
  tan: 'sand',
  beige: 'sand',
};

export interface ResolvedPhotoColour extends PhotoColour {
  /**
   * True when the input named/hex value maps to *this* photograph exactly; false when we fell back
   * to the closest supported photo (so the UI can be honest that it isn't an exact colour match).
   */
  exact: boolean;
}

const HEX_RE = /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The photo whose fabric mid-tone is nearest the given hex, by simple RGB distance. */
function closestByHex(hex: string): PhotoColour {
  const [r, g, b] = hexToRgb(hex);
  let best = PHOTO_COLOURS[FALLBACK_PHOTO_SLUG]!;
  let bestDist = Infinity;
  for (const c of Object.values(PHOTO_COLOURS)) {
    const [cr, cg, cb] = hexToRgb(c.hex);
    const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

/**
 * Resolve a catalogue colour *name* (preferred — exact photograph) or a raw *hex* (closest photo)
 * to a photograph. Unknown names fall back to Bone. The `exact` flag records whether the returned
 * photograph is a true match or a stand-in, so callers never claim a fallback is the real colour.
 */
export function resolvePhotoColour(input: string | null | undefined): ResolvedPhotoColour {
  const raw = (input ?? '').trim();
  const slug = NAME_TO_SLUG[raw.toLowerCase()];
  if (slug) return { ...PHOTO_COLOURS[slug]!, exact: true };
  if (HEX_RE.test(raw)) return { ...closestByHex(raw), exact: false };
  return { ...PHOTO_COLOURS[FALLBACK_PHOTO_SLUG]!, exact: false };
}

/** The photograph for the side currently being viewed — the real photographed front or back. */
export function photoForView(colour: PhotoColour, view: GarmentView): string {
  return view === 'back' ? colour.back : colour.front;
}
