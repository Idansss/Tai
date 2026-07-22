'use client';

import { Alert, cn, Eyebrow, Heading, Price, Text } from '@tms/ui';
import { Check, ChevronDown, Copy, Crop, Heart, Move, RotateCcw, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/account/auth-provider';
import { useCart } from '@/components/cart/cart-provider';
import { ShirtPhotoMockup } from '@/components/garment/shirt-photo-mockup';
import { type PlacementBox, PlacementCanvas } from '@/components/studio/placement-canvas';
import { designSignature, persistSavedDesign } from '@/lib/account';
import { artworkImage } from '@/lib/artwork-images';
import { dataProvider } from '@/lib/data';
import type { ArtworkSummary, StudioOptions } from '@/lib/data';
import { GARMENT_VIEWBOX, GARMENTS, garmentStyleFromName } from '@/lib/garments/registry';
import { printBox } from '@/lib/garments/print-geometry';
import type { CartSideRender } from '@/lib/cart';
import {
  buildStudioQuery,
  collectSides,
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
  switchView,
} from '@/lib/studio';
import {
  defaultOpenStudioFolderId,
  groupArtworksForStudio,
  type StudioArtworkFolder,
} from '@/lib/studio-artwork-folders';

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
  const artworkFolders = useMemo(() => groupArtworksForStudio(artworks), [artworks]);
  const [openFolders, setOpenFolders] = useState<Set<StudioArtworkFolder['id']>>(
    () =>
      new Set([defaultOpenStudioFolderId(groupArtworksForStudio(artworks), initialConfig.artwork)]),
  );
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(false);
  // Whether the free-placement box is in crop mode (edge handles) vs move/resize/rotate.
  const [cropMode, setCropMode] = useState(false);
  // An optional customer note for this piece (personalisation / gift message).
  const [note, setNote] = useState('');
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

  // Turn the garment over: the side you were editing is stashed and the other side loads, so each
  // side keeps its own print. This is how a piece gets a design on BOTH sides.
  const switchToView = useCallback((next: StudioView) => {
    setCopied(false);
    setStatus(null);
    setAdded(false);
    setSaved(false);
    setConfig((c) => switchView(c, next));
  }, []);

  // Clear the print from the side currently being viewed.
  const clearSide = useCallback(() => {
    setCopied(false);
    setAdded(false);
    setSaved(false);
    setConfig((c) =>
      resolveStudioConfig(
        { ...c, placement: null, scale: null, transform: IDENTITY_TRANSFORM },
        options,
      ),
    );
  }, [options]);

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
    // Same shared helper the mockup's print layer uses, so overlay and print agree by construction.
    const box = printBox(zone, {
      scale: artworkScale,
      dxPct: transform.dx,
      dyPct: transform.dy,
    });
    return {
      ...box,
      viewBoxW: GARMENT_VIEWBOX.w,
      viewBoxH: GARMENT_VIEWBOX.h,
    };
  }, [garmentStyle, config.view, transform.dx, transform.dy, artworkScale]);

  // The interactive layer is live only when a print is actually shown on the side being viewed.
  const canEdit = Boolean(artworkPrint && placement && scale && artworkOnThisView);
  const customised = !isIdentityTransform(transform);
  // Which sides currently carry a print — drives the front/back indicators and the "this side is
  // blank" prompt. The active side is printed when it has a placement + scale.
  const printedAreas = useMemo(() => new Set(collectSides(config).map((s) => s.area)), [config]);
  const activePrinted = printedAreas.has(config.view);
  // The other side is printed too → clearing the active side still leaves a valid piece.
  const otherPrinted = Boolean(config.otherSide);
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
        const folderId = defaultOpenStudioFolderId(artworkFolders, slug);
        setOpenFolders((prev) => new Set([...prev, folderId]));
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
    [config.artwork, config.view, config.quantity, loadingArtwork, artworkFolders],
  );

  // Placement chips are already limited to the side being viewed, so this just prints the active
  // side. (Switching sides is the garment-view toggle's job, via `switchToView`.)
  const selectPlacement = (id: string) => update({ placement: id });

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
    if (!variantId || !garment) {
      setStatus('That combination is not available — choose a different colour or size.');
      return;
    }
    // Build per-side render data for every printed side (one piece can print front AND back).
    const designSides: Partial<Record<StudioView, CartSideRender>> = {};
    const sideLabels: string[] = [];
    let primary: {
      plLabel: string;
      scLabel: string;
      plId: string;
      scSlug: string;
      area: StudioView;
    } | null = null;
    for (const side of collectSides(config)) {
      const pl = garment.placements.find((p) => p.id === side.placement);
      const sc = pl?.scalePresets.find((s) => s.slug === side.scale);
      if (!pl || !sc) continue;
      const zone = GARMENTS[garmentStyle].print[side.area];
      designSides[side.area] = {
        printScale: (sc.widthPct / 100) * (GARMENT_VIEWBOX.w / zone.maxW),
        ...(isIdentityTransform(side.transform) ? {} : { transform: side.transform }),
        placementId: pl.id,
        scalePresetId: sc.slug,
      };
      sideLabels.push(`${side.area} (${sc.label.toLowerCase()})`);
      primary ??= {
        plLabel: pl.label,
        scLabel: sc.label,
        plId: pl.id,
        scSlug: sc.slug,
        area: side.area,
      };
    }
    if (!primary) {
      setStatus('Add a print to at least one side to continue.');
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
      placement: primary.plLabel,
      scale: primary.scLabel,
      view: primary.area,
      // The approved tuple for the primary side — the canonical-form base for the line's identity
      // and what a server-backed add will post (the per-side geometry rides in `designSides`).
      configuration: {
        artworkVersionId: garment.artworkVersionId,
        garmentVariantId: variantId,
        placementId: primary.plId,
        scalePresetId: primary.scSlug,
        view: primary.area === 'back' ? 'BACK' : 'FRONT',
      },
      // The exact per-side composition, so the cart redraws front and back precisely.
      artworkSlug: artwork.slug,
      designSides,
      ...(note.trim() ? { note: note.trim() } : null),
    });
    setAdded(true);
    setStatus(
      `Added to your bag: ${artwork.title} on ${garment.title}, ${config.colour}, size ${config.size} — ` +
        `printed ${sideLabels.join(' + ')}.`,
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
              <ShirtPhotoMockup
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
              aria-label="Garment view — front and back can each carry a print"
            >
              {(['front', 'back'] as StudioView[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => switchToView(v)}
                  aria-pressed={config.view === v}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm capitalize outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                    config.view === v ? 'bg-accent text-on-accent' : 'text-ink-2 hover:text-ink',
                  )}
                >
                  {v}
                  {/* A dot marks a side that already has a print. */}
                  <span
                    aria-hidden
                    className={cn(
                      'size-1.5 rounded-full',
                      printedAreas.has(v)
                        ? config.view === v
                          ? 'bg-on-accent'
                          : 'bg-[var(--color-accent-primary)]'
                        : 'bg-transparent ring-1 ring-current',
                    )}
                  />
                  <span className="sr-only">
                    {printedAreas.has(v) ? '(has a print)' : '(blank)'}
                  </span>
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
            <p className="mb-3 text-xs text-muted">
              Every Collections piece, split into two folders.
            </p>
            <div className="space-y-2">
              {artworkFolders.map(({ folder, artworks: folderArtworks }) => {
                const open = openFolders.has(folder.id);
                const regionId = `studio-folder-${folder.id}`;
                return (
                  <div key={folder.id} className="overflow-hidden rounded-md border border-line">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFolders((prev) => {
                          const next = new Set(prev);
                          if (next.has(folder.id)) next.delete(folder.id);
                          else next.add(folder.id);
                          return next;
                        })
                      }
                      aria-expanded={open}
                      aria-controls={regionId}
                      className="flex w-full items-center justify-between gap-3 bg-canvas-2 px-3 py-2.5 text-left outline-none transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-ink">
                          {folder.label}
                          <span className="ml-2 font-normal normal-case tracking-normal text-muted">
                            {folderArtworks.length}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-[0.7rem] text-muted">
                          {folder.hint}
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          'size-4 shrink-0 text-muted transition-transform duration-[var(--duration-base)] motion-reduce:transition-none',
                          open && 'rotate-180',
                        )}
                        aria-hidden
                      />
                    </button>
                    <div
                      id={regionId}
                      className={cn(
                        'grid transition-[grid-template-rows] duration-[var(--duration-base)] motion-reduce:transition-none',
                        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                      )}
                    >
                      <div className="overflow-hidden">
                        <ul className="grid grid-cols-3 gap-3 p-3">
                          {folderArtworks.map((a) => (
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
                                <span className="block truncate px-2 py-1.5 text-xs text-ink">
                                  {a.title}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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

          <Section step={5} title={`Placement · ${config.view}`} disabled={!garment}>
            <div className="flex flex-wrap items-center gap-2">
              {/* Starting points approved for THIS side; drag/resize/crop fine-tunes from here. */}
              {(garment?.placements ?? [])
                .filter((p) => p.area === config.view)
                .map((p) => (
                  <ChipButton
                    key={p.id}
                    selected={config.placement === p.id}
                    onClick={() => selectPlacement(p.id)}
                  >
                    {p.label}
                  </ChipButton>
                ))}
              {/* Clearing is only offered when the other side keeps the piece printed. */}
              {activePrinted && otherPrinted ? (
                <button
                  type="button"
                  onClick={clearSide}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted outline-none transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                >
                  <RotateCcw className="size-4" aria-hidden /> Leave this side blank
                </button>
              ) : null}
            </div>
            {placement ? (
              <Text size="sm" tone="muted" className="mt-2">
                Printed at {placement.printWidthMm} × {placement.printHeightMm} mm on the{' '}
                {config.view}. Turn the garment over to print the other side too.
              </Text>
            ) : (
              <Text size="sm" tone="muted" className="mt-2">
                The {config.view} is blank — pick a placement above to print it, or leave it as is.
              </Text>
            )}
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
                    [
                      'Prints',
                      collectSides(config)
                        .map((s) => {
                          const pl = garment?.placements.find((p) => p.id === s.placement);
                          const sc = pl?.scalePresets.find((x) => x.slug === s.scale);
                          return `${s.area} · ${sc?.label ?? ''}`.trim();
                        })
                        .join('   ·   ') || null,
                    ],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex gap-2">
                    <dt className="text-muted">{label}</dt>
                    <dd className="capitalize text-ink-2">{value ?? '—'}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {artwork && customised ? (
              <Text size="sm" tone="muted" className="mt-2">
                Custom placement — you’ve adjusted the {config.view} print from its{' '}
                {scale?.label?.toLowerCase()} {placement?.label?.toLowerCase()} start.
              </Text>
            ) : null}

            {artwork ? (
              <div className="mt-5">
                <label
                  htmlFor="studio-note"
                  className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.08em] text-muted"
                >
                  <span>Add a note (optional)</span>
                  <span className="tabular-nums text-muted">{note.length}/200</span>
                </label>
                <textarea
                  id="studio-note"
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value.slice(0, 200));
                    setAdded(false);
                    setSaved(false);
                  }}
                  rows={2}
                  maxLength={200}
                  placeholder="A gift message, or a note about how you’d like this printed."
                  className="mt-2 w-full resize-y rounded-md border border-line-2 bg-canvas px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                />
              </div>
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
