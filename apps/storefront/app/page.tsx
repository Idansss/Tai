import { Frame, Marquee, Reveal, Rule, SectionIndex, buttonVariants } from '@tms/ui';
import {
  DEFAULT_HERO,
  DEFAULT_STUDIO,
  getPublishedHomepageContent,
  getSiteContentClient,
} from '@tms/site-content';
import { ArrowRight, ArrowUpRight, Palette } from 'lucide-react';
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { ArtworkCard } from '@/components/artwork/artwork-card';
import { ArtworkMedia } from '@/components/artwork/artwork-media';
import { HeroPlate } from '@/components/hero-plate';
import { dataProvider } from '@/lib/data';

export const metadata: Metadata = {
  title: 'From Africa, to You',
  description:
    'Original African-heritage illustration, drawn by hand and printed on considered garments. A premium digital gallery and interactive design studio — the artwork is the hero.',
};

/**
 * Editable hero + studio content from the CMS (cached; fails safe to the built-in
 * defaults so the homepage never breaks on a content-layer hiccup).
 */
const loadHomepageContent = unstable_cache(
  async () => {
    try {
      const client = getSiteContentClient();
      const [hero, studio] = await Promise.all([
        getPublishedHomepageContent(client, 'hero'),
        getPublishedHomepageContent(client, 'studio'),
      ]);
      return { hero, studio };
    } catch (error) {
      console.error('[storefront] homepage content unavailable', error);
      return { hero: DEFAULT_HERO, studio: DEFAULT_STUDIO };
    }
  },
  ['cms:homepage'],
  { revalidate: 30, tags: ['cms:homepage'] },
);

export default async function HomePage() {
  const [{ items: artworks }, content] = await Promise.all([
    dataProvider.listArtworks({ limit: 6 }),
    loadHomepageContent(),
  ]);
  const featured = artworks.slice(0, 6);
  const hero = content.hero;
  const studio = content.studio;

  return (
    <>
      {/* Announcement marquee */}
      <div className="border-b border-line bg-canvas-2/60">
        <div className="mx-auto max-w-[90rem] px-4 py-2 sm:px-6 lg:px-8">
          <Marquee
            items={[
              'From Africa, to you',
              'Hand-drawn, studio-printed',
              'Limited editions, numbered',
              'Worldwide shipping, tracked',
              'Design your own piece in the studio',
            ]}
          />
        </div>
      </div>

      {/* Hero — art-led, editorial, asymmetric. Amber press-glow blooms behind the plate. */}
      <section className="relative overflow-hidden border-b border-line">
        <span className="press-glow left-[52%] top-[8%] hidden size-[38rem] lg:block" aria-hidden />
        <div className="relative mx-auto grid max-w-[90rem] items-start gap-8 px-4 pb-12 pt-6 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:pb-16 lg:pt-8">
          <div className="lg:col-span-6 lg:pr-8 xl:col-span-6">
            <Reveal className="flex items-center gap-3">
              <span className="inline-block size-1.5 rotate-45 bg-accent-2" aria-hidden />
              <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted">
                {hero.eyebrow}
              </span>
            </Reveal>
            <Reveal
              as="h1"
              delay={60}
              className="mt-4 font-display text-[clamp(3rem,7.4vw,6.25rem)] font-bold uppercase leading-[0.92] tracking-[-0.02em] text-ink"
            >
              {hero.titleLead}
              <span className="text-accent-2">{hero.titleAccent}</span>
              {hero.titleTail}
            </Reveal>
            <Reveal
              as="p"
              delay={120}
              className="mt-5 max-w-prose font-sans text-lg leading-relaxed text-ink-2"
            >
              {hero.subtitle}
            </Reveal>
            <Reveal delay={180} className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href={hero.primaryCtaHref}
                className={buttonVariants({ size: 'lg', variant: 'accent' })}
              >
                {hero.primaryCtaLabel} <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href={hero.secondaryCtaHref}
                className={buttonVariants({ size: 'lg', variant: 'secondary' })}
              >
                <Palette className="size-4" aria-hidden /> {hero.secondaryCtaLabel}
              </Link>
            </Reveal>
          </div>

          {/* Hero plate — the artwork, large, on a cursor-reactive 3D tilt */}
          <Reveal delay={140} from="none" className="lg:col-span-6">
            <HeroPlate>
              <Link
                href={hero.imageHref}
                className="group block rounded-[var(--radius-lg)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              >
                <Frame ratio="wide" interactive className="shadow-lg ring-1 ring-line/60">
                  <ArtworkMedia
                    src={hero.imageUrl}
                    seed={hero.imageTitle}
                    title={hero.imageTitle}
                    label={hero.imageCaption}
                    priority
                  />
                </Frame>
                {/* Edition stamp — the studio's press signature */}
                <div className="mt-4 flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-muted">
                    <span className="text-accent-2">◆</span> {hero.imageCaption}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-ink transition-colors group-hover:text-accent-2">
                    {hero.imageTitle} <ArrowUpRight className="size-4" aria-hidden />
                  </span>
                </div>
              </Link>
            </HeroPlate>
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
            <Frame ratio="artwork" mat="canvas" interactive className="border-line">
              <ArtworkMedia
                src={studio.imageUrl}
                seed={studio.imageUrl}
                title={`${studio.headingLine1} ${studio.headingLine2}`}
                label={studio.eyebrow}
              />
            </Frame>
          </Reveal>
          <div className="lg:col-span-6 lg:col-start-7">
            <Reveal className="flex items-center gap-4">
              <SectionIndex index={2} />
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted">
                {studio.eyebrow}
              </span>
            </Reveal>
            <Reveal
              as="h2"
              delay={60}
              className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.01em] text-ink sm:text-5xl"
            >
              {studio.headingLine1}
              <br />
              {studio.headingLine2}
            </Reveal>
            <Reveal
              as="p"
              delay={120}
              className="mt-6 max-w-prose text-lg leading-relaxed text-ink-2"
            >
              {studio.body}
            </Reveal>
            <Reveal delay={180} className="mt-9 flex flex-wrap gap-3">
              <Link href={studio.primaryCtaHref} className={buttonVariants({ size: 'lg' })}>
                {studio.primaryCtaLabel} <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href={studio.secondaryCtaHref}
                className={buttonVariants({ size: 'lg', variant: 'ghost' })}
              >
                {studio.secondaryCtaLabel}
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
              An independent studio for original African-heritage art, released as limited apparel —
              from Africa, to you.
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
