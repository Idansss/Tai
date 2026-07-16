import {
  Frame,
  Marquee,
  Reveal,
  Rule,
  SectionIndex,
  buttonVariants,
} from '@tms/ui';
import { ArrowRight, ArrowUpRight, Palette } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArtworkCard } from '@/components/artwork/artwork-card';
import { ArtworkVisual } from '@/components/artwork/artwork-visual';
import { dataProvider } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Art-led apparel',
  description: 'A premium digital gallery and interactive design studio. The artwork is the hero.',
};

export default async function HomePage() {
  const { items: artworks } = await dataProvider.listArtworks({ limit: 7 });
  const hero = artworks[0];
  const featured = artworks.slice(1, 7);

  return (
    <>
      {/* Announcement marquee */}
      <div className="border-b border-line bg-canvas-2/60">
        <div className="mx-auto max-w-[90rem] px-4 py-2.5 sm:px-6 lg:px-8">
          <Marquee
            items={[
              'New drop — “Nightline” chapter live',
              'Hand-drawn, studio-printed',
              'Limited editions, numbered',
              'Free UK shipping over £75',
              'Design your own piece in the studio',
            ]}
          />
        </div>
      </div>

      {/* Hero — art-led, editorial, asymmetric */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="mx-auto grid max-w-[90rem] items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:py-24">
          <div className="lg:col-span-6 lg:pr-8 xl:col-span-6">
            <Reveal className="flex items-center gap-3">
              <SectionIndex index={0} />
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted">
                Independent art-fashion studio · Est. 2021
              </span>
            </Reveal>
            <Reveal
              as="h1"
              delay={60}
              className="mt-6 font-display text-[clamp(2.75rem,7vw,5.75rem)] font-semibold leading-[0.98] tracking-[-0.02em] text-ink"
            >
              The artwork
              <br />
              is the hero.
            </Reveal>
            <Reveal
              as="p"
              delay={120}
              className="mt-6 max-w-prose font-sans text-lg leading-relaxed text-ink-2"
            >
              Original drawings and comic-line illustrations, applied to considered garments.
              Explore the gallery, then step into the design studio to make a piece your own.
            </Reveal>
            <Reveal delay={180} className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/artworks" className={buttonVariants({ size: 'lg' })}>
                Explore artworks <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/design-studio"
                className={buttonVariants({ size: 'lg', variant: 'secondary' })}
              >
                <Palette className="size-4" aria-hidden /> Open Design Studio
              </Link>
            </Reveal>
          </div>

          {/* Hero plate — the artwork, large */}
          <Reveal delay={140} from="none" className="lg:col-span-6">
            {hero ? (
              <Link
                href={`/artworks/${hero.slug}`}
                className="group block rounded-[var(--radius-lg)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              >
                <Frame ratio="wide" interactive className="shadow-md">
                  <ArtworkVisual seed={hero.slug} title={hero.title} label={hero.collection} />
                </Frame>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-muted">
                    Featured · {hero.collection}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm text-ink transition-colors group-hover:text-accent-2">
                    {hero.title} <ArrowUpRight className="size-4" aria-hidden />
                  </span>
                </div>
              </Link>
            ) : null}
          </Reveal>
        </div>
      </section>

      {/* 01 — Gallery */}
      <section aria-labelledby="gallery-title" className="border-b border-line">
        <div className="mx-auto max-w-[90rem] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <Reveal className="flex items-end justify-between gap-6">
            <div className="flex items-start gap-4">
              <SectionIndex index={1} className="mt-2" />
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Gallery</p>
                <h2
                  id="gallery-title"
                  className="mt-2 font-display text-4xl font-semibold tracking-[-0.01em] text-ink sm:text-5xl"
                >
                  From the collection
                </h2>
              </div>
            </div>
            <Link
              href="/artworks"
              className="hidden shrink-0 items-center gap-1 rounded-sm pb-2 font-mono text-xs uppercase tracking-[0.12em] text-muted outline-none transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] sm:inline-flex"
            >
              View all <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </Reveal>

          <ul className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3">
            {featured.map((art, i) => (
              <Reveal as="li" key={art.id} delay={(i % 3) * 70}>
                <ArtworkCard artwork={art} />
              </Reveal>
            ))}
          </ul>

          <Link
            href="/artworks"
            className={`mt-10 sm:hidden ${buttonVariants({ variant: 'secondary', fullWidth: true })}`}
          >
            View all artworks <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>

      {/* 02 — The studio (dark art-focus band) */}
      <section data-theme="dark" className="bg-canvas text-ink">
        <div className="mx-auto grid max-w-[90rem] items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:py-28">
          <Reveal from="none" className="lg:col-span-5">
            {hero ? (
              <Frame ratio="artwork" mat="canvas" className="border-line">
                <ArtworkVisual
                  seed={`${hero.slug}-studio`}
                  title={hero.title}
                  label="Process"
                />
              </Frame>
            ) : null}
          </Reveal>
          <div className="lg:col-span-6 lg:col-start-7">
            <Reveal className="flex items-center gap-4">
              <SectionIndex index={2} />
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted">
                The studio
              </span>
            </Reveal>
            <Reveal
              as="h2"
              delay={60}
              className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.01em] text-ink sm:text-5xl"
            >
              Drawn by hand.
              <br />
              Made for colour.
            </Reveal>
            <Reveal as="p" delay={120} className="mt-6 max-w-prose text-lg leading-relaxed text-ink-2">
              Every piece begins as ink on paper. We print on considered garments so the line work
              keeps its weight and the colour reads the way it was drawn. No mass runs, no filler,
              nothing that gets in the way of the work.
            </Reveal>
            <Reveal delay={180} className="mt-9 flex flex-wrap gap-3">
              <Link href="/about" className={buttonVariants({ size: 'lg' })}>
                The studio story <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/collections"
                className={buttonVariants({ size: 'lg', variant: 'ghost' })}
              >
                Browse collections
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 03 — Design Studio invitation */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-[90rem] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <Reveal className="mx-auto max-w-3xl text-center">
            <div className="flex items-center justify-center gap-3">
              <SectionIndex index={3} />
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted">
                Interactive
              </span>
            </div>
            <h2 className="mt-6 font-display text-4xl font-semibold tracking-[-0.01em] text-ink sm:text-5xl">
              Design your own piece
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink-2">
              Choose an artwork, a garment, colour, size and placement, with a live preview at every
              step. Save it, share it, or add it to your bag.
            </p>
          </Reveal>

          <Reveal delay={80} className="mt-12">
            <div className="grid gap-4 sm:grid-cols-3">
              {['Choose the artwork', 'Configure the garment', 'Preview & make it yours'].map(
                (step, i) => (
                  <div key={step} className="border border-line bg-surface p-6">
                    <SectionIndex index={i + 1} />
                    <p className="mt-4 font-display text-xl font-medium text-ink">{step}</p>
                  </div>
                ),
              )}
            </div>
            <div className="mt-8 flex justify-center">
              <Link href="/design-studio" className={buttonVariants({ size: 'lg' })}>
                <Palette className="size-4" aria-hidden /> Open Design Studio
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Closing statement */}
      <section>
        <div className="mx-auto max-w-[90rem] px-4 py-20 sm:px-6 lg:px-8">
          <Rule label="Tai Manic Studios" />
          <Reveal className="mt-10">
            <p className="max-w-4xl font-display text-3xl font-medium leading-[1.15] tracking-[-0.01em] text-ink sm:text-4xl">
              An independent studio for original comic-line art, released as limited apparel — where
              the work always comes first.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/artworks" className={buttonVariants({ size: 'lg' })}>
                Enter the gallery <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/drops" className={buttonVariants({ size: 'lg', variant: 'secondary' })}>
                See upcoming drops
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
