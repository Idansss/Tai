'use client';

import { Alert, cn, Frame, Price, SectionIndex, Text } from '@tms/ui';
import { Check, Copy, Heart, RotateCcw, ShoppingBag, ZoomIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/components/account/auth-provider';
import { ArtworkMedia } from '@/components/artwork/artwork-media';
import { useCart } from '@/components/cart/cart-provider';
import { ShirtMockup } from '@/components/product/shirt-mockup';
import { designSignature, persistSavedDesign } from '@/lib/account';
import type { ArtworkSummary, StudioOptions } from '@/lib/data';
import {
  buildStudioQuery,
  EMPTY_STUDIO_CONFIG,
  isStudioConfigComplete,
  type StudioConfig,
  type StudioView,
} from '@/lib/studio';

function ChipButton({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'rounded-md border px-3.5 py-2 text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
        selected
          ? 'border-accent-2 bg-accent-2/15 font-medium text-ink'
          : 'border-line-2 text-ink-2 hover:border-line-2 hover:bg-canvas-2 hover:text-ink',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      {children}
    </button>
  );
}

function Section({
  step,
  title,
  disabled,
  children,
}: {
  step: number;
  title: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className={cn(disabled && 'pointer-events-none opacity-40')}>
      <div className="flex items-center gap-3">
        <SectionIndex index={step} />
        <h2 className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-muted">
          {title}
        </h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function DesignStudio({
  artworks,
  artworkImages,
  options,
  initialConfig,
}: {
  artworks: ArtworkSummary[];
  artworkImages: Record<string, string | null>;
  options: StudioOptions;
  initialConfig: StudioConfig;
}) {
  const [config, setConfig] = useState<StudioConfig>(() => ({
    ...EMPTY_STUDIO_CONFIG,
    ...initialConfig,
    colour: initialConfig.colour ?? options.colours[0]?.name ?? null,
    placement: initialConfig.placement ?? 'centre-chest',
    scale: initialConfig.scale ?? 'medium',
  }));
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [zoom, setZoom] = useState(false);
  const { addItem } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const update = useCallback((patch: Partial<StudioConfig>) => {
    setCopied(false);
    setStatus(null);
    setAdded(false);
    setSaved(false);
    setConfig((c) => ({ ...c, ...patch }));
  }, []);

  const artwork = useMemo(
    () => artworks.find((a) => a.slug === config.artwork) ?? null,
    [artworks, config.artwork],
  );
  const garments = artwork?.compatibleGarments ?? [];
  const colour = options.colours.find((c) => c.name === config.colour) ?? null;
  const placement = options.placements.find((p) => p.id === config.placement) ?? null;
  const scale = options.scalePresets.find((s) => s.id === config.scale) ?? null;
  const printX = config.printX ?? placement?.x ?? 50;
  const printY = config.printY ?? placement?.y ?? 38;
  const printWidth = config.printWidth ?? scale?.widthPct ?? 44;
  const complete = isStudioConfigComplete(config);
  const artworkOnThisView = placement && placement.area === config.view;

  const selectArtwork = (slug: string) => {
    const next = artworks.find((a) => a.slug === slug);
    update({
      artwork: slug,
      // Reset the garment if it is no longer compatible.
      garment: next?.compatibleGarments.includes(config.garment ?? '') ? config.garment : null,
    });
  };

  const selectPlacement = (id: string) => {
    const p = options.placements.find((pl) => pl.id === id);
    update({
      placement: id,
      view: p?.area ?? config.view,
      printX: p?.x ?? null,
      printY: p?.y ?? null,
    });
  };

  const selectView = (view: StudioView) => {
    if (placement?.area === view) {
      update({ view });
      return;
    }
    const next =
      options.placements.find(
        (candidate) => candidate.area === view && candidate.id === 'centre-chest',
      ) ?? options.placements.find((candidate) => candidate.area === view);
    update({
      view,
      placement: next?.id ?? config.placement,
      printX: next?.x ?? config.printX,
      printY: next?.y ?? config.printY,
    });
  };

  const copyShareLink = useCallback(async () => {
    const url = `${window.location.origin}/design-studio${buildStudioQuery(config)}`;
    try {
      window.history.replaceState(null, '', buildStudioQuery(config) || '/design-studio');
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setStatus('Copy this link from your address bar to share your design.');
    }
  }, [config]);

  const addToBag = () => {
    if (!complete || !artwork || !config.garment || !config.colour || !config.size) {
      setStatus('Choose an artwork, garment, colour and size to continue.');
      return;
    }
    addItem({
      productSlug: `${artwork.slug}-studio`,
      artworkSlug: artwork.slug,
      href: `/design-studio${buildStudioQuery(config)}`,
      artworkTitle: artwork.title,
      garment: config.garment,
      colour: config.colour,
      size: config.size,
      priceMinor: artwork.startingPriceMinor,
      currency: artwork.currency,
      quantity: Math.max(1, config.quantity),
      placement: placement?.label,
      scale: scale?.label,
      view: config.view,
      printX,
      printY,
      printWidth,
      cropZoom: config.cropZoom,
      cropX: config.cropX,
      cropY: config.cropY,
    });
    setAdded(true);
    setStatus(
      `Added to your bag: ${artwork.title} on ${config.garment}, ${config.colour}, size ${config.size}, ` +
        `${placement?.label.toLowerCase()} Â· ${scale?.label.toLowerCase()}.`,
    );
  };

  const saveDesign = () => {
    if (!complete || !artwork) {
      setStatus('Choose an artwork, garment, colour and size to save your design.');
      return;
    }
    if (!user) {
      // Saving belongs to an account, send guests to sign in and return here.
      router.push(`/login?next=${encodeURIComponent(`/design-studio${buildStudioQuery(config)}`)}`);
      return;
    }
    persistSavedDesign(user.email, {
      id: designSignature(config),
      config,
      artworkTitle: artwork.title,
      colourHex: colour?.hex,
      priceMinor: artwork.startingPriceMinor,
      currency: artwork.currency,
      savedAt: new Date().toISOString(),
    });
    setAdded(false);
    setSaved(true);
    setStatus(`Saved to your designs: ${artwork.title}. Find it under your account.`);
  };

  return (
    <div
      data-theme="dark"
      className="overflow-hidden rounded-[var(--radius-xl)] border border-line bg-canvas"
    >
      <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* Preview â€” the artwork composited onto the garment */}
        <div className="border-b border-line bg-canvas-2/40 p-4 sm:p-6 lg:sticky lg:top-16 lg:self-start lg:border-b-0 lg:border-r">
          <div className="lg:mx-auto lg:max-w-md">
            <Frame
              ratio="product"
              mat="none"
              rounded
              className="bg-[radial-gradient(120%_100%_at_50%_0%,#343331_0%,#171716_100%)]"
              role="img"
              aria-label={
                artwork
                  ? `${artwork.title} on ${config.colour} ${config.garment ?? 'garment'}, ${config.view} view`
                  : 'Design preview, choose an artwork to begin'
              }
            >
              <div
                aria-hidden
                style={{ transform: zoom ? 'scale(1.35)' : 'scale(1)' }}
                className="absolute inset-0 transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)] motion-reduce:transition-none"
              >
                <div className="absolute inset-0 p-[3%] sm:p-[5%]">
                  <ShirtMockup
                    colourHex={colour?.hex}
                    view={config.view}
                    garment={config.garment ?? undefined}
                    showPrintArea
                    print={
                      artwork && placement && scale
                        ? {
                            x: printX,
                            y: printY,
                            widthPct: printWidth,
                            cropZoom: config.cropZoom,
                            cropX: config.cropX,
                            cropY: config.cropY,
                            visible: Boolean(artworkOnThisView),
                            artwork: (
                              <ArtworkMedia
                                src={artworkImages[artwork.slug]}
                                seed={artwork.slug}
                                title={artwork.title}
                                className="object-contain"
                              />
                            ),
                          }
                        : undefined
                    }
                    interactive={Boolean(artwork && artworkOnThisView)}
                    onPrintChange={({ x, y, widthPct }) =>
                      update({ printX: x, printY: y, printWidth: widthPct })
                    }
                  />
                </div>
              </div>

              <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2 py-0.5 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-white">
                {config.view}
              </span>
              {artwork ? (
                <button
                  type="button"
                  onClick={() => setZoom((z) => !z)}
                  aria-pressed={zoom}
                  aria-label={zoom ? 'Zoom out' : 'Zoom in'}
                  className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-black/45 text-white outline-none transition-colors hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                >
                  <ZoomIn className="size-4" aria-hidden />
                </button>
              ) : null}
              {artwork && !artworkOnThisView ? (
                <span className="absolute inset-x-0 bottom-3 text-center font-mono text-xs uppercase tracking-[0.08em] text-white/80">
                  Artwork is on the {placement?.area}
                </span>
              ) : null}
              {artwork && artworkOnThisView ? (
                <span className="pointer-events-none absolute inset-x-0 bottom-3 text-center font-mono text-[0.65rem] uppercase tracking-[0.08em] text-white/80">
                  Drag to move · corner handle to resize
                </span>
              ) : null}
            </Frame>

            {/* View toggle */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div
                className="inline-flex rounded-md border border-line-2 bg-surface p-1"
                role="group"
                aria-label="Garment view"
              >
                {(['front', 'back'] as StudioView[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => selectView(v)}
                    aria-pressed={config.view === v}
                    className={cn(
                      'rounded px-4 py-1.5 text-sm capitalize outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                      config.view === v ? 'bg-accent text-on-accent' : 'text-ink-2 hover:text-ink',
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <Text size="sm" tone="muted" className="text-right text-xs">
                Guide preview
              </Text>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-8 p-4 sm:p-6">
          <Section step={1} title="Choose artwork">
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {artworks.map((a) => {
                const active = config.artwork === a.slug;
                return (
                  <li key={a.slug}>
                    <button
                      type="button"
                      onClick={() => selectArtwork(a.slug)}
                      aria-pressed={active}
                      className="group block w-full text-left outline-none"
                    >
                      <span
                        className={cn(
                          'relative block overflow-hidden rounded-md border transition-colors',
                          'group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-[var(--color-focus-ring)]',
                          active
                            ? 'border-accent-2 ring-2 ring-accent-2'
                            : 'border-line-2 group-hover:border-line',
                        )}
                      >
                        <span aria-hidden className="block aspect-[4/5] w-full">
                          <ArtworkMedia
                            src={artworkImages[a.slug]}
                            seed={a.slug}
                            title={a.title}
                            className="object-contain"
                          />
                        </span>
                        {active ? (
                          <span
                            aria-hidden
                            className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-accent text-on-accent"
                          >
                            <Check className="size-3.5" />
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1.5 block truncate text-xs text-ink-2 group-hover:text-ink">
                        {a.title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section step={2} title="Garment" disabled={!artwork}>
            <div className="flex flex-wrap gap-2">
              {garments.length === 0 ? (
                <Text size="sm" tone="muted">
                  Select an artwork to see its garments.
                </Text>
              ) : (
                garments.map((g) => (
                  <ChipButton
                    key={g}
                    selected={config.garment === g}
                    onClick={() => update({ garment: g })}
                  >
                    {g}
                  </ChipButton>
                ))
              )}
            </div>
          </Section>

          <Section step={3} title={`Colour: ${config.colour ?? ''}`} disabled={!artwork}>
            <div className="flex flex-wrap gap-3">
              {options.colours.map((c) => {
                const active = config.colour === c.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => update({ colour: c.name })}
                    aria-pressed={active}
                    aria-label={c.name}
                    title={c.name}
                    className="grid size-9 place-items-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                  >
                    <span
                      aria-hidden
                      style={{ backgroundColor: c.hex }}
                      className={cn(
                        'grid size-7 place-items-center rounded-full border border-line-2 ring-offset-2 ring-offset-[var(--color-background-primary)]',
                        active && 'ring-2 ring-accent-2',
                      )}
                    >
                      {active ? (
                        <Check className="size-4 text-white mix-blend-difference" aria-hidden />
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section step={4} title="Size" disabled={!artwork}>
            <div className="flex flex-wrap gap-2">
              {options.sizes.map((s) => (
                <ChipButton
                  key={s}
                  selected={config.size === s}
                  onClick={() => update({ size: s })}
                >
                  {s}
                </ChipButton>
              ))}
            </div>
          </Section>

          <Section step={5} title="Placement" disabled={!artwork}>
            <div className="flex flex-wrap gap-2">
              {options.placements.map((p) => (
                <ChipButton
                  key={p.id}
                  selected={config.placement === p.id}
                  onClick={() => selectPlacement(p.id)}
                >
                  {p.label}
                </ChipButton>
              ))}
            </div>
          </Section>

          <Section step={6} title="Scale" disabled={!artwork}>
            <div className="flex flex-wrap gap-2">
              {options.scalePresets.map((s) => (
                <ChipButton
                  key={s.id}
                  selected={config.scale === s.id}
                  onClick={() => update({ scale: s.id, printWidth: s.widthPct })}
                >
                  {s.label}
                </ChipButton>
              ))}
            </div>
          </Section>

          <Section step={7} title="Crop & fine tune" disabled={!artwork}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs text-ink-2">
                <span className="flex justify-between">
                  <span>Print size</span>
                  <span>{Math.round(printWidth)}%</span>
                </span>
                <input
                  type="range"
                  min="12"
                  max="70"
                  step="1"
                  value={printWidth}
                  onChange={(event) =>
                    update({ printWidth: Number(event.target.value), scale: null })
                  }
                  className="mt-2 w-full accent-[var(--color-accent-secondary)]"
                />
              </label>
              <label className="text-xs text-ink-2">
                <span className="flex justify-between">
                  <span>Crop zoom</span>
                  <span>{config.cropZoom.toFixed(1)}×</span>
                </span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={config.cropZoom}
                  onChange={(event) => update({ cropZoom: Number(event.target.value) })}
                  className="mt-2 w-full accent-[var(--color-accent-secondary)]"
                />
              </label>
              <label className="text-xs text-ink-2">
                <span className="flex justify-between">
                  <span>Crop horizontal</span>
                  <span>{config.cropX}%</span>
                </span>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={config.cropX}
                  onChange={(event) => update({ cropX: Number(event.target.value) })}
                  className="mt-2 w-full accent-[var(--color-accent-secondary)]"
                />
              </label>
              <label className="text-xs text-ink-2">
                <span className="flex justify-between">
                  <span>Crop vertical</span>
                  <span>{config.cropY}%</span>
                </span>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={config.cropY}
                  onChange={(event) => update({ cropY: Number(event.target.value) })}
                  className="mt-2 w-full accent-[var(--color-accent-secondary)]"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() =>
                update({
                  printX: placement?.x ?? null,
                  printY: placement?.y ?? null,
                  printWidth: scale?.widthPct ?? null,
                  cropZoom: 1,
                  cropX: 0,
                  cropY: 0,
                })
              }
              className="mt-4 inline-flex items-center gap-2 text-xs text-ink-2 underline-offset-4 hover:text-ink hover:underline"
            >
              <RotateCcw className="size-3.5" aria-hidden /> Reset print transform
            </button>
          </Section>

          {/* Summary + actions */}
          <div className="border-t border-line pt-6">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">Summary</p>
            {artwork ? (
              <div className="mt-3 flex items-center justify-between gap-3">
                <h2 className="font-display text-xl font-medium text-ink">{artwork.title}</h2>
                <Price
                  amountMinor={artwork.startingPriceMinor}
                  currency={artwork.currency}
                  className="text-ink"
                />
              </div>
            ) : (
              <Text size="sm" tone="muted" className="mt-2">
                Choose an artwork to begin your design.
              </Text>
            )}

            {artwork ? (
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                {(
                  [
                    ['Garment', config.garment],
                    ['Colour', config.colour],
                    ['Size', config.size],
                    ['Placement', placement?.label],
                    ['Scale', scale?.label],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <dt className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-muted">
                      {label}
                    </dt>
                    <dd className="text-ink-2">{value ?? 'â€”'}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={addToBag}
                disabled={!complete}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-on-accent outline-none transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:bg-[var(--color-disabled-background)] disabled:text-disabled-ink sm:flex-initial"
              >
                <ShoppingBag className="size-4" aria-hidden /> Add to bag
              </button>
              <button
                type="button"
                onClick={saveDesign}
                disabled={!complete}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-line-2 px-4 text-sm text-ink outline-none transition-colors hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Heart
                  className={cn('size-4', saved && 'fill-current text-accent-2')}
                  aria-hidden
                />
                {saved ? 'Design saved' : 'Save design'}
              </button>
              <button
                type="button"
                onClick={copyShareLink}
                disabled={!artwork}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-line-2 px-4 text-sm text-ink outline-none transition-colors hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copied ? (
                  <Check className="size-4" aria-hidden />
                ) : (
                  <Copy className="size-4" aria-hidden />
                )}
                {copied ? 'Link copied' : 'Copy share link'}
              </button>
              <button
                type="button"
                onClick={() => update({ artwork: null, garment: null, size: null })}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md px-3 text-sm text-muted outline-none transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              >
                <RotateCcw className="size-4" aria-hidden /> Reset
              </button>
            </div>

            <div aria-live="polite" className="mt-4 empty:hidden">
              {status ? (
                <Alert
                  tone={added || saved ? 'success' : 'info'}
                  title={added ? 'Added to bag' : saved ? 'Design saved' : 'Design Studio'}
                >
                  {status}
                </Alert>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
