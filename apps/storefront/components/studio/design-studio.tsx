'use client';

import { Alert, cn, Eyebrow, Heading, Price, Text } from '@tms/ui';
import { Check, Copy, Crop, Heart, Move, RotateCcw, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/account/auth-provider';
import { useCart } from '@/components/cart/cart-provider';
import { GarmentMockup } from '@/components/garment/garment-mockup';
import { type PlacementBox, PlacementCanvas } from '@/components/studio/placement-canvas';
import { designSignature, persistSavedDesign } from '@/lib/account';
import { artworkImage } from '@/lib/artwork-images';
import { dataProvider } from '@/lib/data';
import type { ArtworkSummary, StudioOptions } from '@/lib/data';
import { GARMENT_VIEWBOX, GARMENTS, garmentStyleFromName } from '@/lib/garments/registry';
import {
  buildStudioQuery,
  EMPTY_STUDIO_CONFIG,
  findGarment,
  findPlacement,
  findVariantId,
  IDENTITY_TRANSFORM,
  isIdentityTransform,
  isStudioConfigComplete,
  type PrintTransform,
  resolveStudioConfig,
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
        'rounded-md border px-3 py-2 text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
        selected
          ? 'border-[var(--color-accent-primary)] bg-accent text-on-accent'
          : 'border-line-2 text-ink hover:bg-canvas-2',
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
      <div className="flex items-center gap-2">
        <span className="grid size-6 place-items-center rounded-full border border-line-2 text-xs text-muted">
          {step}
        </span>
        <h2 className="text-xs font-medium uppercase tracking-[0.08em] text-muted">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function DesignStudio({
  artworks,
  options: initialOptions,
  initialConfig,
}: {
  artworks: ArtworkSummary[];
  options: StudioOptions;
  initialConfig: StudioConfig;
}) {
  // The approved options for the *currently selected* artwork. Seeded from the server for the
  // artwork in the URL, then swapped in place when the customer picks a different one — no
  // navigation, so the page never reloads mid-design.
  const [options, setOptions] = useState<StudioOptions>(initialOptions);
  // Everything unapproved is dropped up front, so a shared link can never seed the picker with a
  // placement or scale this artwork was not approved for.
  const [config, setConfig] = useState<StudioConfig>(() =>
    resolveStudioConfig(initialConfig, initialOptions),
  );
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(false);
  // Whether the free-placement box is in crop mode (edge handles) vs move/resize/rotate.
  const [cropMode, setCropMode] = useState(false);
  // The artwork whose options are being fetched, so the picker can show progress and ignore a
  // slow response that a newer click has superseded.
  const [loadingArtwork, setLoadingArtwork] = useState<string | null>(null);
  const latestRequest = useRef<string | null>(null);
  const { addItem } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  /**
   * Re-resolve on every change rather than trusting the patch: choices are interdependent, so
   * picking a placement can invalidate the scale (presets belong to a placement) and picking a
   * colour can invalidate the size (not every pair is a variant).
   */
  const update = useCallback(
    (patch: Partial<StudioConfig>) => {
      setCopied(false);
      setStatus(null);
      setAdded(false);
      setSaved(false);
      // Choosing a different starting point (garment/placement/scale) is a fresh canvas, so the
      // free adjustment resets to identity — presets are starting points, not modifiers of a drag.
      const resetsTransform =
        'garment' in patch || 'placement' in patch || 'scale' in patch || 'artwork' in patch;
      setConfig((c) =>
        resolveStudioConfig(
          { ...c, ...patch, ...(resetsTransform ? { transform: IDENTITY_TRANSFORM } : null) },
          options,
        ),
      );
    },
    [options],
  );

  // Live edits from the interactive canvas — a pure geometry change, so it skips the reset above.
  const updateTransform = useCallback((transform: PrintTransform) => {
    setCopied(false);
    setAdded(false);
    setSaved(false);
    setConfig((c) => ({ ...c, transform }));
  }, []);

  const resetPlacement = useCallback(() => updateTransform(IDENTITY_TRANSFORM), [updateTransform]);

  // Clearing the artwork cascades: with no artwork there is no garment, colour, size, placement or
  // scale to keep, so resetting these three is enough for resolveStudioConfig to empty the rest.
  const reset = useCallback(() => update({ artwork: null, garment: null, size: null }), [update]);

  const artwork = useMemo(
    () => artworks.find((a) => a.slug === config.artwork) ?? null,
    [artworks, config.artwork],
  );
  const garment = findGarment(options, config.garment);
  const colour = garment?.colours.find((c) => c.name === config.colour) ?? null;
  const placement = findPlacement(garment, config.placement);
  // Scale presets belong to the placement, so the options change with it.
  const scale = placement?.scalePresets.find((s) => s.slug === config.scale) ?? null;
  const sizes = useMemo(
    () =>
      garment?.variants.filter((v) => v.colour === config.colour).map((v) => v.size) ??
      ([] as string[]),
    [garment, config.colour],
  );
  // The drawing itself, for the print preview.
  const artworkPrint = artwork ? artworkImage(artwork.slug) : null;
  const complete = isStudioConfigComplete(config);
  const artworkOnThisView = placement && placement.area === config.view;
  // Same silhouette the product page uses — never the old flat colour box.
  const garmentStyle = garmentStyleFromName(garment?.title);
  // Studio widthPct is % of the garment width; GarmentMockup scale is a fraction of the print zone.
  const mockupScale = useMemo(() => {
    if (!scale) return 1;
    const zone = GARMENTS[garmentStyle].print[config.view];
    return (scale.widthPct / 100) * (GARMENT_VIEWBOX.w / zone.maxW);
  }, [scale, garmentStyle, config.view]);

  const transform = config.transform;
  // The width the mockup prints at: the approved preset, multiplied by the customer's free resize.
  const artworkScale = mockupScale * transform.scale;
  // The interactive box, in the garment's viewBox units — the print zone shifted by the free
  // offset and sized by the free scale. Shared verbatim with the mockup so overlay and print agree.
  const placementBox = useMemo<PlacementBox>(() => {
    const zone = GARMENTS[garmentStyle].print[config.view];
    return {
      centerX: zone.cx + (transform.dx / 100) * GARMENT_VIEWBOX.w,
      centerY: zone.cy + (transform.dy / 100) * GARMENT_VIEWBOX.h,
      width: zone.maxW * artworkScale,
      height: zone.maxH * artworkScale,
      viewBoxW: GARMENT_VIEWBOX.w,
      viewBoxH: GARMENT_VIEWBOX.h,
    };
  }, [garmentStyle, config.view, transform.dx, transform.dy, artworkScale]);

  // The interactive layer is live only when a print is actually shown on the side being viewed.
  const canEdit = Boolean(artworkPrint && placement && scale && artworkOnThisView);
  const customised = !isIdentityTransform(transform);
  // Every section gates on the artwork (`disabled={!artwork}`), and everything else is resolved
  // from it, so the artwork is what "something to reset" means — and what keeps the button's
  // enabled state in step with the visible selection.
  const dirty = Boolean(config.artwork);

  /**
   * Approval is per artwork+garment pair, so a different artwork means a different set of approved
   * canvases. This used to navigate (router.push) so the server could refetch, which reloaded the
   * whole page and — because this client component instance survives a searchParams change — left
   * the picker showing the old selection. Instead we fetch the new artwork's options in place and
   * resolve a fresh config for it, so the choice takes effect immediately with no reload.
   *
   * `latestRequest` guards against out-of-order responses: only the most recent click wins.
   */
  const selectArtwork = useCallback(
    async (slug: string) => {
      if (slug === config.artwork || slug === loadingArtwork) return;
      latestRequest.current = slug;
      setLoadingArtwork(slug);
      setCopied(false);
      setStatus(null);
      setAdded(false);
      setSaved(false);
      try {
        const nextOptions = await dataProvider.getStudioOptions(slug);
        if (latestRequest.current !== slug) return; // a newer selection superseded this one
        const nextConfig = resolveStudioConfig(
          { ...EMPTY_STUDIO_CONFIG, artwork: slug, view: config.view, quantity: config.quantity },
          nextOptions,
        );
        setOptions(nextOptions);
        setConfig(nextConfig);
        // Keep the URL shareable/refresh-safe without a Next navigation (which would reload).
        window.history.replaceState(null, '', `/design-studio?artwork=${encodeURIComponent(slug)}`);
      } catch {
        if (latestRequest.current === slug) {
          setStatus('That artwork could not be loaded — please try again.');
        }
      } finally {
        if (latestRequest.current === slug) setLoadingArtwork(null);
      }
    },
    [config.artwork, config.view, config.quantity, loadingArtwork],
  );

  const selectPlacement = (id: string) => {
    const next = findPlacement(garment, id);
    // Turn the garment to the side the print is actually on.
    update({ placement: id, ...(next ? { view: next.area } : {}) });
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
    // A configuration with no known price cannot be previewed in the bag. Guessing at one
    // would show a number the server never agreed to (ADR-015).
    if (artwork.startingPriceMinor === null || !artwork.currency) {
      setStatus('This artwork has no price yet, so it cannot be added to your bag.');
      return;
    }
    const variantId = findVariantId(config, garment);
    if (!variantId || !garment || !placement || !scale) {
      setStatus('That combination is not available — choose a different colour or size.');
      return;
    }
    addItem({
      productSlug: `${artwork.slug}-studio`,
      href: `/design-studio${buildStudioQuery(config)}`,
      artworkTitle: artwork.title,
      garment: garment.title,
      colour: config.colour,
      size: config.size,
      priceMinor: artwork.startingPriceMinor,
      currency: artwork.currency,
      quantity: Math.max(1, config.quantity),
      placement: placement.label,
      scale: scale.label,
      view: config.view,
      // The approved tuple. Carrying it means the line's identity is the contract's
      // canonical form rather than a slug string we made up, and it is what a
      // server-backed add will post (never a price).
      configuration: {
        artworkVersionId: garment.artworkVersionId,
        garmentVariantId: variantId,
        placementId: placement.id,
        scalePresetId: scale.slug,
        view: config.view === 'back' ? 'BACK' : 'FRONT',
      },
      // The free adjustment, when the customer moved/resized/rotated/cropped. Undefined for an
      // untouched approved placement, so those lines keep their plain canonical identity.
      ...(customised ? { transform } : null),
    });
    setAdded(true);
    setStatus(
      `Added to your bag: ${artwork.title} on ${garment.title}, ${config.colour}, size ${config.size}, ` +
        `${placement.label.toLowerCase()} · ${scale.label.toLowerCase()}.`,
    );
  };

  const saveDesign = () => {
    if (!complete || !artwork) {
      setStatus('Choose an artwork, garment, colour and size to save your design.');
      return;
    }
    if (!user) {
      // Saving belongs to an account — send guests to sign in and return here.
      router.push(`/login?next=${encodeURIComponent(`/design-studio${buildStudioQuery(config)}`)}`);
      return;
    }
    if (artwork.startingPriceMinor === null || !artwork.currency) {
      setStatus('This artwork has no price yet, so it cannot be saved.');
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
    /*
     * Paper, like every other page. This used to force data-theme="dark", which made the Studio
     * a second identity: the one screen where the site went black. The drawings live on white
     * paper, so a dark ground turns every piece into a lightbox (docs/frontend/UI_DIRECTION.md —
     * "one ground colour across the site; no page goes dark").
     */
    <div className="rounded-[var(--radius-xl)] border border-line bg-canvas-2 p-4 sm:p-6">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Preview — the shared GarmentMockup silhouette (same as product pages), not a flat box. */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          {/* Outer card carries the padding + frame; the inner box is the bare coordinate space the
              mockup and the interactive overlay share, so their geometry lines up exactly. */}
          <div className="rounded-[var(--radius-lg)] border border-line bg-canvas p-4 sm:p-6">
            <div
              className="relative w-full overflow-hidden"
              role="img"
              aria-label={
                artwork
                  ? `${artwork.title} on ${config.colour ?? 'garment'} ${garment?.title ?? 'tee'}, ${config.view} view`
                  : 'Design preview — choose an artwork to begin'
              }
            >
              <GarmentMockup
                style={garmentStyle}
                colour={config.colour ?? colour?.hex ?? 'Bone'}
                view={config.view}
                artwork={
                  artworkPrint && placement && scale
                    ? {
                        src: artworkPrint,
                        area: placement.area,
                        scale: artworkScale,
                        offset: { xPct: transform.dx, yPct: transform.dy },
                        rotation: transform.rotation,
                        crop: {
                          top: transform.cropTop,
                          right: transform.cropRight,
                          bottom: transform.cropBottom,
                          left: transform.cropLeft,
                        },
                        clipToBody: true,
                        alt: '',
                      }
                    : null
                }
                priority
                sizes="(min-width: 1024px) 40vw, 90vw"
              />
              {canEdit ? (
                <PlacementCanvas
                  box={placementBox}
                  transform={transform}
                  onChange={updateTransform}
                  cropMode={cropMode}
                />
              ) : null}
              <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-xs uppercase tracking-[0.08em] text-white">
                {config.view}
              </span>
              {artwork && placement && !artworkOnThisView ? (
                <span className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-ink-2">
                  Artwork is on the {placement.area}
                </span>
              ) : null}
            </div>
          </div>

          {/* Free-placement toolbar + garment view toggle. */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div
              className="inline-flex rounded-md border border-line p-1"
              role="group"
              aria-label="Garment view"
            >
              {(['front', 'back'] as StudioView[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => update({ view: v })}
                  aria-pressed={config.view === v}
                  className={cn(
                    'rounded px-3 py-1.5 text-sm capitalize outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                    config.view === v ? 'bg-accent text-on-accent' : 'text-ink-2 hover:text-ink',
                  )}
                >
                  {v}
                </button>
              ))}
            </div>

            {canEdit ? (
              <>
                <div
                  className="inline-flex rounded-md border border-line p-1"
                  role="group"
                  aria-label="Placement tool"
                >
                  <button
                    type="button"
                    onClick={() => setCropMode(false)}
                    aria-pressed={!cropMode}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                      !cropMode ? 'bg-accent text-on-accent' : 'text-ink-2 hover:text-ink',
                    )}
                  >
                    <Move className="size-4" aria-hidden /> Move
                  </button>
                  <button
                    type="button"
                    onClick={() => setCropMode(true)}
                    aria-pressed={cropMode}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                      cropMode ? 'bg-accent text-on-accent' : 'text-ink-2 hover:text-ink',
                    )}
                  >
                    <Crop className="size-4" aria-hidden /> Crop
                  </button>
                </div>
                <button
                  type="button"
                  onClick={resetPlacement}
                  disabled={!customised}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted outline-none transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RotateCcw className="size-4" aria-hidden /> Reset placement
                </button>
              </>
            ) : null}
          </div>
          <Text size="sm" tone="muted" className="mt-2">
            {canEdit
              ? cropMode
                ? 'Crop: drag the edge handles inward to trim the artwork. Switch to Move to reposition.'
                : 'Drag the artwork to move it, corner handles to resize, the top handle to rotate. Arrow keys nudge.'
              : 'Live garment preview — colour, placement and scale update as you build.'}
          </Text>
        </div>

        {/* Configuration */}
        <div className="space-y-8">
          {/*
           * Static column header (not sticky): pinning this bar while the artwork grid scrolled
           * made it float over the thumbnails and jitter. Negative margins undo the card padding
           * so the rule hits the card edges.
           */}
          <div className="-mx-4 -mt-4 flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:-mx-6 sm:-mt-6 sm:px-6">
            <Eyebrow>Build your piece</Eyebrow>
            <button
              type="button"
              onClick={reset}
              disabled={!dirty}
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted outline-none transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="size-4" aria-hidden /> Reset
            </button>
          </div>

          <Section step={1} title="Choose artwork">
            <ul className="grid grid-cols-3 gap-3">
              {artworks.map((a) => (
                <li key={a.slug}>
                  <button
                    type="button"
                    onClick={() => selectArtwork(a.slug)}
                    aria-pressed={config.artwork === a.slug}
                    aria-busy={loadingArtwork === a.slug}
                    className={cn(
                      'group block w-full overflow-hidden rounded-md border text-left outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                      config.artwork === a.slug
                        ? 'border-[var(--color-accent-primary)] ring-2 ring-[var(--color-accent-primary)]'
                        : 'border-line-2 hover:border-line',
                    )}
                  >
                    {/* The drawing, not a gradient. Unchosen pieces rest in graphite and the
                        chosen one is in colour — the same rule as the wall: colour is a reward,
                        and here it marks what you picked. */}
                    <span className="relative block aspect-[4/5] w-full overflow-hidden bg-canvas-2">
                      {artworkImage(a.slug) ? (
                        <Image
                          src={artworkImage(a.slug) as string}
                          alt=""
                          aria-hidden
                          fill
                          sizes="120px"
                          className={cn(
                            'object-cover transition-[filter] duration-[var(--duration-base)] motion-reduce:transition-none',
                            config.artwork === a.slug
                              ? 'grayscale-0'
                              : 'grayscale group-hover:grayscale-0 motion-reduce:grayscale-0',
                          )}
                        />
                      ) : null}
                      {loadingArtwork === a.slug ? (
                        <span className="absolute inset-0 grid place-items-center bg-canvas/60">
                          <span
                            role="status"
                            aria-label="Loading artwork"
                            className="size-5 animate-spin rounded-full border-2 border-ink border-t-transparent motion-reduce:animate-none"
                          />
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate px-2 py-1.5 text-xs text-ink">{a.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Section>

          <Section step={2} title="Garment" disabled={!artwork}>
            <div className="flex flex-wrap gap-2">
              {!artwork ? (
                <Text size="sm" tone="muted">
                  Select an artwork to see its garments.
                </Text>
              ) : options.garments.length === 0 ? (
                <Text size="sm" tone="muted">
                  This artwork has no approved garments yet.
                </Text>
              ) : (
                options.garments.map((g) => (
                  <ChipButton
                    key={g.slug}
                    selected={config.garment === g.slug}
                    onClick={() => update({ garment: g.slug })}
                  >
                    {g.title}
                  </ChipButton>
                ))
              )}
            </div>
          </Section>

          <Section step={3} title={`Colour: ${config.colour ?? ''}`} disabled={!garment}>
            <div className="flex flex-wrap gap-3">
              {(garment?.colours ?? []).map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => update({ colour: c.name })}
                  aria-pressed={config.colour === c.name}
                  aria-label={c.name}
                  title={c.name}
                  className="grid size-9 place-items-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                >
                  <span
                    aria-hidden
                    style={{ backgroundColor: c.hex }}
                    className={cn(
                      'size-7 rounded-full border border-line-2 ring-offset-2 ring-offset-[var(--color-background-primary)]',
                      config.colour === c.name && 'ring-2 ring-[var(--color-accent-primary)]',
                    )}
                  />
                </button>
              ))}
            </div>
          </Section>

          <Section step={4} title="Size" disabled={!garment}>
            <div className="flex flex-wrap gap-2">
              {/* Only sizes that pair with the chosen colour as a real variant. */}
              {sizes.map((s) => (
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

          <Section step={5} title="Placement" disabled={!garment}>
            <div className="flex flex-wrap gap-2">
              {/* Approved for this artwork on this garment — never a free-form position. */}
              {(garment?.placements ?? []).map((p) => (
                <ChipButton
                  key={p.id}
                  selected={config.placement === p.id}
                  onClick={() => selectPlacement(p.id)}
                >
                  {p.label}
                </ChipButton>
              ))}
            </div>
            {placement ? (
              <Text size="sm" tone="muted" className="mt-2">
                Printed at {placement.printWidthMm} × {placement.printHeightMm} mm, positioned to
                studio standards.
              </Text>
            ) : null}
          </Section>

          <Section step={6} title="Scale" disabled={!placement}>
            <div className="flex flex-wrap gap-2">
              {/* Presets belong to the placement, so these change when the placement does. */}
              {(placement?.scalePresets ?? []).map((s) => (
                <ChipButton
                  key={s.slug}
                  selected={config.scale === s.slug}
                  onClick={() => update({ scale: s.slug })}
                >
                  {s.label}
                </ChipButton>
              ))}
            </div>
          </Section>

          {/* Summary + actions */}
          <div className="border-t border-line pt-6">
            <Eyebrow>Summary</Eyebrow>
            {artwork ? (
              <div className="mt-2 flex items-center justify-between gap-3">
                <Heading as={2} size="md">
                  {artwork.title}
                </Heading>
                {artwork.startingPriceMinor !== null && artwork.currency ? (
                  <Price
                    amountMinor={artwork.startingPriceMinor}
                    currency={artwork.currency}
                    className="text-ink"
                  />
                ) : null}
              </div>
            ) : (
              <Text size="sm" tone="muted" className="mt-2">
                Choose an artwork to begin your design.
              </Text>
            )}

            {artwork ? (
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                {(
                  [
                    // The garment's name, not its slug: `config.garment` is an identifier now.
                    ['Garment', garment?.title ?? null],
                    ['Colour', config.colour],
                    ['Size', config.size],
                    ['Placement', placement?.label],
                    ['Scale', scale?.label],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex gap-2">
                    <dt className="text-muted">{label}</dt>
                    <dd className="text-ink-2">{value ?? '—'}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {artwork && customised ? (
              <Text size="sm" tone="muted" className="mt-2">
                Custom placement — you’ve adjusted the artwork from the{' '}
                {scale?.label?.toLowerCase()} {placement?.label?.toLowerCase()} start.
              </Text>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={addToBag}
                disabled={!complete}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:bg-[var(--color-disabled-background)] disabled:text-disabled-ink"
              >
                <ShoppingBag className="size-4" aria-hidden /> Add to bag
              </button>
              <button
                type="button"
                onClick={saveDesign}
                disabled={!complete}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line-2 px-4 text-sm text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Heart className={cn('size-4', saved && 'fill-current text-accent')} aria-hidden />
                {saved ? 'Design saved' : 'Save design'}
              </button>
              <button
                type="button"
                onClick={copyShareLink}
                disabled={!artwork}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line-2 px-4 text-sm text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copied ? (
                  <Check className="size-4" aria-hidden />
                ) : (
                  <Copy className="size-4" aria-hidden />
                )}
                {copied ? 'Link copied' : 'Copy share link'}
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
