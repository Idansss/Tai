'use client';

import { cn } from '@tms/ui';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PillLink } from '@/components/site/pill-link';
import { Reveal } from '@/components/site/reveal';

export interface HeroSlide {
  slug: string;
  src: string;
  title: string;
}

/** How long each artwork holds the stage before the next takes over. */
const ADVANCE_MS = 4200;

/**
 * The homepage hero as a crossfading slideshow. Each artwork covers the stage in turn, in step with
 * the numbered 01–05 pillar row: the active pillar lights up, and clicking one jumps to its image.
 * Auto-advance pauses for `prefers-reduced-motion`, where it stays on the first frame and the
 * pillars remain clickable.
 */
export function HeroSlideshow({ slides, pillars }: { slides: HeroSlide[]; pillars: string[] }) {
  const steps = pillars.length;
  const [active, setActive] = useState(0);
  // The image shown for a step; slides cycle if there are fewer of them than pillars.
  const shown = slides.length ? active % slides.length : 0;

  useEffect(() => {
    if (steps <= 1 || slides.length <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // A timeout (not an interval) keyed on `active` so a manual pillar click restarts the dwell.
    const id = window.setTimeout(() => setActive((i) => (i + 1) % steps), ADVANCE_MS);
    return () => window.clearTimeout(id);
  }, [active, steps, slides.length]);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-neutral-950 text-white">
      {/* Crossfading stage: each artwork covers the hero in turn. */}
      <div aria-hidden className="absolute inset-0">
        {slides.map((slide, i) => (
          <Image
            key={slide.slug}
            src={slide.src}
            alt=""
            fill
            priority={i === 0}
            sizes="(min-width: 1536px) 1440px, 92vw"
            quality={90}
            className={cn(
              'object-cover object-center transition-opacity duration-[1200ms] ease-out motion-reduce:transition-none',
              i === shown ? 'opacity-80' : 'opacity-0',
            )}
          />
        ))}
      </div>
      {/* Scrim: the one place chrome sits over art, so the headline stays legible. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20"
      />

      <div className="relative flex min-h-[34rem] flex-col justify-between gap-12 p-6 sm:min-h-[40rem] sm:p-10 lg:p-14">
        <div className="max-w-2xl">
          <Reveal
            as="p"
            className="font-display text-xs font-medium uppercase tracking-[0.22em] text-white/70"
          >
            From Africa To You
          </Reveal>
          <Reveal
            as="h1"
            delay={80}
            className="mt-5 font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl"
          >
            From Africa,
            <br />
            to you.
          </Reveal>
          <Reveal
            as="p"
            delay={160}
            className="mt-6 max-w-md text-sm leading-relaxed text-white/75 sm:text-base"
          >
            Hand-drawn art from across Africa — printed on cotton, made to order. Own a piece of
            the continent, positioned the way the studio approved it.
          </Reveal>
          <Reveal delay={240} className="mt-8 flex flex-wrap items-center gap-3">
            <PillLink href="/artworks" tone="light">
              Shop now
            </PillLink>
            <Link
              href="/design-studio"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white outline-none transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Design studio
            </Link>
          </Reveal>
        </div>

        {/* Numbered pillar row — now the slideshow's controls: the active step lights up, and each
            is clickable to jump straight to that frame. */}
        <Reveal
          as="ol"
          delay={320}
          className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/15 pt-6 sm:grid-cols-3 lg:grid-cols-5"
        >
          {pillars.map((label, i) => {
            const current = i === active;
            return (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-current={current ? 'true' : undefined}
                  aria-label={`Show ${label}`}
                  className={cn(
                    'block w-full text-left outline-none transition-colors focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                    current ? 'text-white' : 'text-white/55 hover:text-white/80',
                  )}
                >
                  <span className="font-display text-xs font-semibold tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="mt-1 text-[0.8rem] leading-snug">{label}</p>
                  {/* A progress underline under the active step. */}
                  <span
                    aria-hidden
                    className={cn(
                      'mt-2 block h-0.5 origin-left rounded-full bg-white/80 transition-transform duration-300',
                      current ? 'scale-x-100' : 'scale-x-0',
                    )}
                  />
                </button>
              </li>
            );
          })}
        </Reveal>
      </div>
    </div>
  );
}
