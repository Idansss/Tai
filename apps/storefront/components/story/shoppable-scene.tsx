'use client';

import { Price } from '@tms/ui';
import { ArrowRight, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import type { StoryHotspot, StoryScene } from '@/lib/data';
import { hotspotActionLabel, hotspotHref, hotspotKindLabel } from '@/lib/stories';

/**
 * A shoppable editorial scene (TMS-F5-007). A placeholder scene image carries
 * numbered hotspots; opening one reveals a small card that links into the
 * catalogue. The full list of hotspots is always rendered below the image as an
 * accessible, no-JS fallback, so every link is reachable by keyboard and to
 * screen readers regardless of the visual markers.
 */
export function ShoppableScene({ scene }: { scene: StoryScene }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const baseId = useId();

  useEffect(() => {
    if (openId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenId(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openId]);

  const panelId = (h: StoryHotspot) => `${baseId}-${h.id}`;

  return (
    <figure className="my-8">
      <div
        className="relative aspect-[16/9] w-full rounded-[var(--radius-lg)] border border-line bg-gradient-to-br from-canvas-2 to-surface-2"
        role="img"
        aria-label={`${scene.caption}, with shoppable hotspots`}
      >
        {scene.hotspots.map((hotspot, index) => {
          const isOpen = openId === hotspot.id;
          // Flip the card above the marker when it sits low in the scene, and
          // clamp its horizontal anchor so it stays within the frame.
          const above = hotspot.y > 58;
          const cardLeft = Math.min(82, Math.max(18, hotspot.x));
          return (
            <div key={hotspot.id}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : hotspot.id)}
                aria-expanded={isOpen}
                aria-controls={panelId(hotspot)}
                aria-label={`${index + 1}. ${hotspot.caption}`}
                style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-full border text-xs font-semibold shadow-sm transition ${
                    isOpen
                      ? 'border-accent bg-accent text-on-accent'
                      : 'border-line bg-surface text-ink hover:border-accent'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="sr-only">{hotspot.caption}</span>
              </button>

              {isOpen ? (
                <div
                  id={panelId(hotspot)}
                  style={{
                    left: `${cardLeft}%`,
                    [above ? 'bottom' : 'top']: `${above ? 100 - hotspot.y : hotspot.y}%`,
                  }}
                  className={`absolute z-10 w-56 max-w-[80vw] -translate-x-1/2 rounded-[var(--radius-md)] border border-line bg-surface p-4 shadow-lg ${
                    above ? 'mb-3' : 'mt-3'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.08em] text-muted">
                      {hotspotKindLabel(hotspot.target)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setOpenId(null)}
                      aria-label="Close"
                      className="-m-1 rounded-sm p-1 text-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                  <p className="mt-1 text-sm font-medium text-ink">{hotspot.target.label}</p>
                  <p className="mt-0.5 text-xs text-muted">{hotspot.caption}</p>
                  {hotspot.target.kind === 'product' ? (
                    <Price
                      amountMinor={hotspot.target.priceMinor}
                      currency={hotspot.target.currency}
                      className="mt-2 block text-sm text-ink"
                    />
                  ) : null}
                  <Link
                    href={hotspotHref(hotspot.target)}
                    className="mt-3 inline-flex items-center gap-1 text-sm text-accent hover:gap-2"
                  >
                    {hotspotActionLabel(hotspot.target)}{' '}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <figcaption className="mt-3 text-sm text-muted">{scene.caption}</figcaption>

      {/* Accessible / no-JS fallback: every hotspot as a reachable link. */}
      <div className="mt-4 rounded-[var(--radius-md)] border border-line bg-canvas-2 p-4">
        <p className="text-xs uppercase tracking-[0.08em] text-muted">In this scene</p>
        <ul className="mt-3 space-y-3">
          {scene.hotspots.map((hotspot, index) => (
            <li key={hotspot.id} className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-[0.65rem] font-semibold text-ink"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{hotspot.target.label}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {hotspot.target.kind === 'product' ? (
                    <Price
                      amountMinor={hotspot.target.priceMinor}
                      currency={hotspot.target.currency}
                      className="text-xs text-muted"
                    />
                  ) : null}
                  <Link
                    href={hotspotHref(hotspot.target)}
                    className="inline-flex items-center gap-1 text-sm text-accent hover:gap-2"
                  >
                    {hotspotActionLabel(hotspot.target)}{' '}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
