export type StudioView = 'front' | 'back';

export interface StudioConfig {
  artwork: string | null;
  garment: string | null;
  colour: string | null;
  size: string | null;
  placement: string | null;
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

/** Parse a shareable Design Studio configuration from URL params. */
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

/** True once the customer has made the minimum choices to add to a bag. */
export function isStudioConfigComplete(config: StudioConfig): boolean {
  return Boolean(config.artwork && config.garment && config.colour && config.size);
}
