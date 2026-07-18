import type { StudioGarment, StudioOptions, StudioPlacement } from './data/types';

export type StudioView = 'front' | 'back';

/**
 * A free-placement transform layered on top of the approved placement + scale.
 *
 * The approved placement gives a starting centre and the approved scale preset a starting width;
 * this transform is the customer's *delta* from that start — a nudge, a resize, a rotation and a
 * crop. Everything here is geometry, so it is resolution-independent: offsets are percentage
 * points of the garment viewBox and crop insets are fractions of the artwork, which means a
 * shared URL reproduces the exact composition on any screen.
 *
 * Historical note: ADR-013 originally forbade this — approved placements were the *only* geometry,
 * so a customer could never compose a print nobody approved. That constraint has been lifted for
 * the customer-facing studio (drag/resize/crop/rotate). The trade-off it guarded — no DPI check on
 * a freely scaled print — now has to be handled downstream (a min-resolution warning, and a
 * server-side geometry + DPI check once the API accepts free geometry rather than approved ids).
 */
export interface PrintTransform {
  /** Print-centre offset from the approved placement centre, in percentage points of the viewBox. */
  dx: number;
  dy: number;
  /** Multiplier on the approved scale-preset width. 1 = the preset exactly as approved. */
  scale: number;
  /** Rotation in degrees, clockwise. */
  rotation: number;
  /** Crop insets as fractions (0–0.9) of the artwork's own width/height. */
  cropTop: number;
  cropRight: number;
  cropBottom: number;
  cropLeft: number;
}

export const IDENTITY_TRANSFORM: PrintTransform = {
  dx: 0,
  dy: 0,
  scale: 1,
  rotation: 0,
  cropTop: 0,
  cropRight: 0,
  cropBottom: 0,
  cropLeft: 0,
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** A crop inset is bounded so a pair of opposite insets can never swallow the whole artwork. */
const clampCropPair = (a: number, b: number): [number, number] => {
  const ca = clamp(a, 0, 0.9);
  const cb = clamp(b, 0, 0.9);
  // Keep at least a 10% sliver of the artwork on each axis.
  if (ca + cb > 0.9) {
    const scaleDown = 0.9 / (ca + cb);
    return [ca * scaleDown, cb * scaleDown];
  }
  return [ca, cb];
};

/** Clamp a (possibly-hostile, from-URL) transform into a safe, renderable range. */
export function clampTransform(t: PrintTransform): PrintTransform {
  const [cropTop, cropBottom] = clampCropPair(t.cropTop, t.cropBottom);
  const [cropLeft, cropRight] = clampCropPair(t.cropLeft, t.cropRight);
  // Wrap rotation into (−180, 180].
  let rotation = ((t.rotation % 360) + 360) % 360;
  if (rotation > 180) rotation -= 360;
  return {
    dx: clamp(Number.isFinite(t.dx) ? t.dx : 0, -60, 60),
    dy: clamp(Number.isFinite(t.dy) ? t.dy : 0, -60, 60),
    scale: clamp(Number.isFinite(t.scale) ? t.scale : 1, 0.2, 3),
    rotation: Number.isFinite(rotation) ? rotation : 0,
    cropTop,
    cropRight,
    cropBottom,
    cropLeft,
  };
}

/**
 * A stable, compact identity string for a transform — empty when it is the identity. Cart lines
 * and saved designs append this so two compositions that share an approved tuple but differ in
 * position/size/rotation/crop stay distinct instead of merging into one.
 */
export function transformKey(t: PrintTransform): string {
  if (isIdentityTransform(t)) return '';
  return [t.dx, t.dy, t.scale, t.rotation, t.cropTop, t.cropRight, t.cropBottom, t.cropLeft]
    .map((n) => round(n, 3))
    .join(',');
}

export function isIdentityTransform(t: PrintTransform): boolean {
  return (
    t.dx === 0 &&
    t.dy === 0 &&
    t.scale === 1 &&
    t.rotation === 0 &&
    t.cropTop === 0 &&
    t.cropRight === 0 &&
    t.cropBottom === 0 &&
    t.cropLeft === 0
  );
}

/** The print on one side of the garment: an approved placement + scale + the free transform. */
export interface SideDesign {
  placement: string | null;
  scale: string | null;
  transform: PrintTransform;
}

/** The non-active side's design, tagged with which side it is (the opposite of `view`). */
export interface StashedSide extends SideDesign {
  area: StudioView;
}

/**
 * A Design Studio configuration.
 *
 * The customer can print BOTH sides of one garment (the same artwork, placed independently). The
 * side currently being edited is `view`, and its design lives in `placement` / `scale` /
 * `transform`. The *other* side's design, when it has one, is stashed in `otherSide` (whose `area`
 * is the opposite of `view`). Switching sides (`switchView`) swaps the two. A shared URL carries the
 * active side under `placement`/`scale`/`px…` and the other side under `oplacement`/`oscale`/`opx…`,
 * so a single-sided link stays exactly as it was and a two-sided one round-trips both prints.
 */
export interface StudioConfig {
  /** Artwork slug. */
  artwork: string | null;
  /** Garment template slug. */
  garment: string | null;
  colour: string | null;
  size: string | null;
  /** The active side's approved placement id (its area is `view`), or null when this side is blank. */
  placement: string | null;
  /** The active side's approved scale-preset slug, valid only within its placement. */
  scale: string | null;
  /** The active side's free drag/resize/rotate/crop, layered on its placement + scale. */
  transform: PrintTransform;
  /** The other side's design, when it carries a print. `area` is always the opposite of `view`. */
  otherSide: StashedSide | null;
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
  transform: IDENTITY_TRANSFORM,
  otherSide: null,
  view: 'front',
  quantity: 1,
};

/** The side opposite the one given. */
export function otherView(view: StudioView): StudioView {
  return view === 'front' ? 'back' : 'front';
}

/** True when a side actually carries a print (an approved placement + scale). */
export function sideHasPrint(
  side: { placement: string | null; scale: string | null } | null,
): boolean {
  return Boolean(side && side.placement && side.scale);
}

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

/** Read a numeric URL param, falling back when it is missing or not a number. */
function num(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Round to a fixed number of decimals, dropping a trailing ".0" so URLs stay tidy. */
function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function parseTransform(p: RawParams, prefix = ''): PrintTransform {
  const g = (k: string) => first(p[`${prefix}${k}`]);
  return clampTransform({
    dx: num(g('px'), 0),
    dy: num(g('py'), 0),
    scale: num(g('ps'), 1),
    rotation: num(g('pr'), 0),
    cropTop: num(g('ct'), 0),
    cropRight: num(g('cr'), 0),
    cropBottom: num(g('cb'), 0),
    cropLeft: num(g('cl'), 0),
  });
}

/**
 * Parse a shareable Design Studio configuration from URL params.
 *
 * Deliberately unvalidated: the caller has not fetched the artwork's approved options yet, so it
 * cannot know whether a placement id is real. `resolveStudioConfig` does that once the options
 * are in hand, and nothing parsed here is trusted enough to send anywhere.
 */
export function parseStudioParams(searchParams: RawParams): StudioConfig {
  const view: StudioView = first(searchParams.view) === 'back' ? 'back' : 'front';
  // The other side (opposite `view`) is present only when it carries its own placement.
  const otherPlacement = first(searchParams.oplacement);
  const otherSide: StashedSide | null = otherPlacement
    ? {
        area: otherView(view),
        placement: otherPlacement,
        scale: first(searchParams.oscale),
        transform: parseTransform(searchParams, 'o'),
      }
    : null;
  return {
    artwork: first(searchParams.artwork),
    garment: first(searchParams.garment),
    colour: first(searchParams.colour),
    size: first(searchParams.size),
    placement: first(searchParams.placement),
    scale: first(searchParams.scale),
    transform: parseTransform(searchParams),
    otherSide,
    view,
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
  // Free transform: only the parts that differ from the approved start are written.
  writeTransform(params, config.transform, '');
  // The other side (opposite `view`), when it carries a print.
  if (config.otherSide && config.otherSide.placement) {
    params.set('oplacement', config.otherSide.placement);
    if (config.otherSide.scale) params.set('oscale', config.otherSide.scale);
    writeTransform(params, config.otherSide.transform, 'o');
  }
  if (config.view === 'back') params.set('view', 'back');
  if (config.quantity > 1) params.set('quantity', String(config.quantity));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** Write a transform's non-identity parts to the query, under an optional key prefix. */
function writeTransform(params: URLSearchParams, t: PrintTransform, prefix: string): void {
  if (t.dx !== 0) params.set(`${prefix}px`, String(round(t.dx, 2)));
  if (t.dy !== 0) params.set(`${prefix}py`, String(round(t.dy, 2)));
  if (t.scale !== 1) params.set(`${prefix}ps`, String(round(t.scale, 3)));
  if (t.rotation !== 0) params.set(`${prefix}pr`, String(round(t.rotation, 1)));
  if (t.cropTop !== 0) params.set(`${prefix}ct`, String(round(t.cropTop, 3)));
  if (t.cropRight !== 0) params.set(`${prefix}cr`, String(round(t.cropRight, 3)));
  if (t.cropBottom !== 0) params.set(`${prefix}cb`, String(round(t.cropBottom, 3)));
  if (t.cropLeft !== 0) params.set(`${prefix}cl`, String(round(t.cropLeft, 3)));
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
/**
 * Reconcile one side's raw (from-URL) design against the garment, for a specific area. Returns null
 * when the placement is not an approved one on that side. A transform is a delta from a specific
 * placement + scale, so it resets when the scale it was authored against does not survive.
 */
function resolveSide(garment: StudioGarment, raw: SideDesign, area: StudioView): SideDesign | null {
  const placement = garment.placements.find((p) => p.id === raw.placement && p.area === area);
  if (!placement) return null;
  const scale =
    placement.scalePresets.find((preset) => preset.slug === raw.scale) ??
    placement.scalePresets[0] ??
    null;
  const scaleKept = scale?.slug === raw.scale;
  return {
    placement: placement.id,
    scale: scale?.slug ?? null,
    transform: scaleKept ? clampTransform(raw.transform ?? IDENTITY_TRANSFORM) : IDENTITY_TRANSFORM,
  };
}

export function resolveStudioConfig(config: StudioConfig, options: StudioOptions): StudioConfig {
  const garment = findGarment(options, config.garment) ?? options.garments[0] ?? null;
  if (!garment) {
    return {
      ...config,
      garment: null,
      colour: null,
      size: null,
      placement: null,
      scale: null,
      transform: IDENTITY_TRANSFORM,
      otherSide: null,
    };
  }

  const colour = garment.colours.some((entry) => entry.name === config.colour)
    ? config.colour
    : (garment.colours[0]?.name ?? null);

  // Only offer a size that pairs with the chosen colour as a real variant.
  const sizesForColour = garment.variants
    .filter((variant) => variant.colour === colour)
    .map((variant) => variant.size);
  const size =
    config.size && sizesForColour.includes(config.size) ? config.size : (sizesForColour[0] ?? null);

  const otherArea = otherView(config.view);
  const activeRaw: SideDesign = {
    placement: config.placement,
    scale: config.scale,
    transform: config.transform ?? IDENTITY_TRANSFORM,
  };
  let active = resolveSide(garment, activeRaw, config.view);
  let other = config.otherSide ? resolveSide(garment, config.otherSide, otherArea) : null;

  // An old single-sided link may carry a placement for the *other* side under the active keys
  // (e.g. `?placement=<back>&view=back`). Migrate it to the other side rather than dropping it.
  if (!active && config.placement && !other) {
    other = resolveSide(garment, activeRaw, otherArea);
  }

  // Land with a print on the viewed side if the piece is entirely blank.
  if (!sideHasPrint(active) && !sideHasPrint(other)) {
    const seed =
      garment.placements.find((p) => p.area === config.view) ?? garment.placements[0] ?? null;
    active = seed
      ? {
          placement: seed.id,
          scale: seed.scalePresets[0]?.slug ?? null,
          transform: IDENTITY_TRANSFORM,
        }
      : null;
  }

  return {
    ...config,
    garment: garment.slug,
    colour,
    size,
    placement: active?.placement ?? null,
    scale: active?.scale ?? null,
    transform: active?.transform ?? IDENTITY_TRANSFORM,
    otherSide: sideHasPrint(other) ? { area: otherArea, ...(other as SideDesign) } : null,
    // `view` is left alone on purpose: it is which side the preview shows.
  };
}

/**
 * Switch the side being edited, stashing the current side and loading the other. With only two
 * sides, the active fields and `otherSide` simply swap.
 */
export function switchView(config: StudioConfig, next: StudioView): StudioConfig {
  if (next === config.view) return config;
  const incoming = config.otherSide?.area === next ? config.otherSide : null;
  const stash: StashedSide = {
    area: config.view,
    placement: config.placement,
    scale: config.scale,
    transform: config.transform,
  };
  return {
    ...config,
    view: next,
    placement: incoming?.placement ?? null,
    scale: incoming?.scale ?? null,
    transform: incoming?.transform ?? IDENTITY_TRANSFORM,
    otherSide: sideHasPrint(stash) ? stash : null,
  };
}

/** The printed sides of a configuration (0, 1, or 2), each tagged with its area. */
export function collectSides(config: StudioConfig): Array<SideDesign & { area: StudioView }> {
  const sides: Array<SideDesign & { area: StudioView }> = [];
  if (sideHasPrint({ placement: config.placement, scale: config.scale })) {
    sides.push({
      area: config.view,
      placement: config.placement,
      scale: config.scale,
      transform: config.transform,
    });
  }
  if (config.otherSide && sideHasPrint(config.otherSide)) {
    sides.push({ ...config.otherSide });
  }
  return sides;
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

/** True once the customer has chosen artwork + garment + colour + size and printed at least one side. */
export function isStudioConfigComplete(config: StudioConfig): boolean {
  return Boolean(
    config.artwork &&
    config.garment &&
    config.colour &&
    config.size &&
    collectSides(config).length > 0,
  );
}
