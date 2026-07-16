export type StudioView = 'front' | 'back';

export interface StudioConfig {
  artwork: string | null;
  garment: string | null;
  colour: string | null;
  size: string | null;
  placement: string | null;
  scale: string | null;
  /** Freeform print transform, percentages relative to the garment preview. */
  printX: number | null;
  printY: number | null;
  printWidth: number | null;
  /** Crop controls: zoom 1–3 and focal offset -50–50. */
  cropZoom: number;
  cropX: number;
  cropY: number;
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
  printX: null,
  printY: null,
  printWidth: null,
  cropZoom: 1,
  cropX: 0,
  cropY: 0,
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

function clampNumber(raw: string | null, min: number, max: number, fallback: number): number {
  const n = raw ? Number.parseFloat(raw) : fallback;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function optionalNumber(raw: string | null, min: number, max: number): number | null {
  if (raw === null) return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
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
    printX: optionalNumber(first(searchParams.printX), 15, 85),
    printY: optionalNumber(first(searchParams.printY), 20, 80),
    printWidth: optionalNumber(first(searchParams.printWidth), 12, 70),
    cropZoom: clampNumber(first(searchParams.cropZoom), 1, 3, 1),
    cropX: clampNumber(first(searchParams.cropX), -50, 50, 0),
    cropY: clampNumber(first(searchParams.cropY), -50, 50, 0),
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
  if (config.printX !== null) params.set('printX', String(Math.round(config.printX * 10) / 10));
  if (config.printY !== null) params.set('printY', String(Math.round(config.printY * 10) / 10));
  if (config.printWidth !== null)
    params.set('printWidth', String(Math.round(config.printWidth * 10) / 10));
  if ((config.cropZoom ?? 1) !== 1) params.set('cropZoom', String(config.cropZoom));
  if ((config.cropX ?? 0) !== 0) params.set('cropX', String(config.cropX));
  if ((config.cropY ?? 0) !== 0) params.set('cropY', String(config.cropY));
  if (config.view === 'back') params.set('view', 'back');
  if (config.quantity > 1) params.set('quantity', String(config.quantity));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** True once the customer has made the minimum choices to add to a bag. */
export function isStudioConfigComplete(config: StudioConfig): boolean {
  return Boolean(config.artwork && config.garment && config.colour && config.size);
}
