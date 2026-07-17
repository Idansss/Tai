import type { StudioGarment, StudioOptions, StudioPlacement } from './data/types';

export type StudioView = 'front' | 'back';

/**
 * A Design Studio configuration.
 *
 * Every field identifies something an administrator approved — a slug, or an approved placement
 * id — never geometry. ADR-013 makes approved placements the only design geometry: an
 * administrator approves an exact placement, not a region. Freeform print position/size and crop
 * would let a customer compose a print nobody approved and that cannot be quality-checked for
 * DPI, so those controls do not exist and this type has nowhere to put them.
 *
 * `placement` is an approved placement id and `scale` an approved scale-preset slug, so a shared
 * URL carries approved ids rather than percentages.
 */
export interface StudioConfig {
  /** Artwork slug. */
  artwork: string | null;
  /** Garment template slug. */
  garment: string | null;
  colour: string | null;
  size: string | null;
  /** An approved placement id. */
  placement: string | null;
  /** An approved scale-preset slug, valid only within the selected placement. */
  scale: string | null;
  view: StudioView;
  quantity: number;
}

export const EMPTY_STUDIO_CONFIG: StudioConfig = {
  artwork: null,
  garment: null,
  colour: null,
  size: null,
  placement: null,
  scale: null,
  view: 'front',
  quantity: 1,
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = v?.trim();
  return trimmed ? trimmed : null;
}

function clampQuantity(raw: string | null): number {
  const n = raw ? Number.parseInt(raw, 10) : 1;
  if (!Number.isFinite(n)) return 1;
  return Math.min(10, Math.max(1, n));
}

/**
 * Parse a shareable Design Studio configuration from URL params.
 *
 * Deliberately unvalidated: the caller has not fetched the artwork's approved options yet, so it
 * cannot know whether a placement id is real. `resolveStudioConfig` does that once the options
 * are in hand, and nothing parsed here is trusted enough to send anywhere.
 */
export function parseStudioParams(searchParams: RawParams): StudioConfig {
  return {
    artwork: first(searchParams.artwork),
    garment: first(searchParams.garment),
    colour: first(searchParams.colour),
    size: first(searchParams.size),
    placement: first(searchParams.placement),
    scale: first(searchParams.scale),
    view: first(searchParams.view) === 'back' ? 'back' : 'front',
    quantity: clampQuantity(first(searchParams.quantity)),
  };
}

/** Build a `?query` string encoding a configuration, omitting empties/defaults. */
export function buildStudioQuery(config: StudioConfig): string {
  const params = new URLSearchParams();
  if (config.artwork) params.set('artwork', config.artwork);
  if (config.garment) params.set('garment', config.garment);
  if (config.colour) params.set('colour', config.colour);
  if (config.size) params.set('size', config.size);
  if (config.placement) params.set('placement', config.placement);
  if (config.scale) params.set('scale', config.scale);
  if (config.view === 'back') params.set('view', 'back');
  if (config.quantity > 1) params.set('quantity', String(config.quantity));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function findGarment(options: StudioOptions, slug: string | null): StudioGarment | null {
  if (!slug) return null;
  return options.garments.find((garment) => garment.slug === slug) ?? null;
}

export function findPlacement(
  garment: StudioGarment | null,
  id: string | null,
): StudioPlacement | null {
  if (!garment || !id) return null;
  return garment.placements.find((placement) => placement.id === id) ?? null;
}

/**
 * Reconcile a parsed configuration against what is actually approved for the artwork, dropping
 * anything unapproved and falling back to the first approved option.
 *
 * This is the guard that makes a shared URL safe. A link carrying a placement from another
 * garment, a scale that does not belong to the chosen placement, or a colour with no buyable
 * variant must not survive into something we send to the server.
 */
export function resolveStudioConfig(config: StudioConfig, options: StudioOptions): StudioConfig {
  const garment = findGarment(options, config.garment) ?? options.garments[0] ?? null;
  if (!garment) {
    return { ...config, garment: null, colour: null, size: null, placement: null, scale: null };
  }

  const placement =
    findPlacement(garment, config.placement) ??
    garment.placements.find((entry) => entry.area === config.view) ??
    garment.placements[0] ??
    null;

  // A scale preset belongs to a placement, so it is only valid within the resolved one.
  const scale =
    placement?.scalePresets.find((preset) => preset.slug === config.scale) ??
    placement?.scalePresets[0] ??
    null;

  const colour = garment.colours.some((entry) => entry.name === config.colour)
    ? config.colour
    : (garment.colours[0]?.name ?? null);

  // Only offer a size that pairs with the chosen colour as a real variant.
  const sizesForColour = garment.variants
    .filter((variant) => variant.colour === colour)
    .map((variant) => variant.size);
  const size =
    config.size && sizesForColour.includes(config.size) ? config.size : (sizesForColour[0] ?? null);

  return {
    ...config,
    garment: garment.slug,
    colour,
    size,
    placement: placement?.id ?? null,
    scale: scale?.slug ?? null,
    // `view` is left alone on purpose: it is which side the preview shows, not part of the
    // approved tuple's identity. Forcing it to the placement's side would fight the customer
    // every time they turned the garment around to look at the back.
  };
}

/** The approved variant for the chosen colour+size, or null when that pair is not buyable. */
export function findVariantId(config: StudioConfig, garment: StudioGarment | null): string | null {
  if (!garment || !config.colour || !config.size) return null;
  return (
    garment.variants.find(
      (variant) => variant.colour === config.colour && variant.size === config.size,
    )?.id ?? null
  );
}

/** True once the customer has made every choice the approved tuple needs. */
export function isStudioConfigComplete(config: StudioConfig): boolean {
  return Boolean(
    config.artwork &&
    config.garment &&
    config.colour &&
    config.size &&
    config.placement &&
    config.scale,
  );
}
