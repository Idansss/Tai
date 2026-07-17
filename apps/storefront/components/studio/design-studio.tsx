'use client';

import { Alert, cn, Eyebrow, Heading, Price, Text } from '@tms/ui';
import { Check, Copy, Heart, RotateCcw, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/components/account/auth-provider';
import { useCart } from '@/components/cart/cart-provider';
import { designSignature, persistSavedDesign } from '@/lib/account';
import type { ArtworkSummary, StudioOptions } from '@/lib/data';
import {
  buildStudioQuery,
  findGarment,
  findPlacement,
  findVariantId,
  isStudioConfigComplete,
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
  options,
  initialConfig,
}: {
  artworks: ArtworkSummary[];
  options: StudioOptions;
  initialConfig: StudioConfig;
}) {
  // Everything unapproved is dropped up front, so a shared link can never seed the picker with a
  // placement or scale this artwork was not approved for.
  const [config, setConfig] = useState<StudioConfig>(() =>
    resolveStudioConfig(initialConfig, options),
  );
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(false);
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
      setConfig((c) => resolveStudioConfig({ ...c, ...patch }, options));
    },
    [options],
  );

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
  const complete = isStudioConfigComplete(config);
  const artworkOnThisView = placement && placement.area === config.view;

  /**
   * Approval is per artwork+garment pair, so a different artwork means a different set of
   * approved canvases. Navigate so the server fetches that artwork's options rather than
   * re-using the ones on screen.
   */
  const selectArtwork = (slug: string) => {
    if (slug === config.artwork) return;
    router.push(`/design-studio?artwork=${encodeURIComponent(slug)}`);
  };

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
    <div
      data-theme="dark"
      className="rounded-[var(--radius-xl)] border border-line bg-canvas p-4 sm:p-6"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Preview */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div
            className="relative aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-lg)] border border-line"
            style={{ backgroundColor: colour?.hex ?? 'var(--color-surface-secondary)' }}
            role="img"
            aria-label={
              artwork
                ? `${artwork.title} on ${config.colour} ${garment?.title ?? 'garment'}, ${config.view} view`
                : 'Design preview — choose an artwork to begin'
            }
          >
            {/* Print-area guide */}
            <div
              aria-hidden
              className="absolute rounded-sm border border-dashed border-white/40"
              style={{ left: '18%', top: '16%', width: '64%', height: '60%' }}
            />
            {/* Artwork overlay */}
            {artwork && artworkOnThisView && placement && scale ? (
              // Position and size both come from the approved placement and preset. Nothing here
              // is customer-authored — this is a rendering of an approved print (ADR-013).
              <div
                className="absolute overflow-hidden rounded-sm bg-gradient-to-br from-white/80 to-white/50 shadow-lg"
                style={{
                  left: `${placement.x}%`,
                  top: `${placement.y}%`,
                  width: `${scale.widthPct}%`,
                  aspectRatio: '4 / 5',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <span className="grid size-full place-items-center px-1 text-center text-[10px] font-medium text-black/70">
                  {artwork.title}
                </span>
              </div>
            ) : null}
            <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-xs uppercase tracking-[0.08em] text-white">
              {config.view}
            </span>
            {artwork && !artworkOnThisView ? (
              <span className="absolute inset-x-0 bottom-3 text-center text-xs text-white/80">
                Artwork is on the {placement?.area}
              </span>
            ) : null}
          </div>

          {/* View toggle */}
          <div
            className="mt-3 inline-flex rounded-md border border-line p-1"
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
          <Text size="sm" tone="muted" className="mt-2">
            A guide preview — the final print is produced to studio standards.
          </Text>
        </div>

        {/* Configuration */}
        <div className="space-y-8">
          <Section step={1} title="Choose artwork">
            <ul className="grid grid-cols-3 gap-3">
              {artworks.map((a) => (
                <li key={a.slug}>
                  <button
                    type="button"
                    onClick={() => selectArtwork(a.slug)}
                    aria-pressed={config.artwork === a.slug}
                    className={cn(
                      'block w-full overflow-hidden rounded-md border text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                      config.artwork === a.slug
                        ? 'border-[var(--color-accent-primary)] ring-2 ring-[var(--color-accent-primary)]'
                        : 'border-line-2 hover:border-line',
                    )}
                  >
                    <span
                      aria-hidden
                      className="block aspect-[4/5] w-full bg-gradient-to-br from-canvas-2 to-surface-2"
                    />
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
              <button
                type="button"
                onClick={() => update({ artwork: null, garment: null, size: null })}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md px-3 text-sm text-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
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
