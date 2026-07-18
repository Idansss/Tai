import { buttonVariants, Container, Price } from '@tms/ui';
import { ArrowRight, ArrowUpRight, MapPin, Package, PencilLine, Truck } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Marquee } from '@/components/site/marquee';
import { PillLink } from '@/components/site/pill-link';
import { Reveal } from '@/components/site/reveal';
import { artworkImage } from '@/lib/artwork-images';
import { dataProvider } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Art-led apparel',
  description:
    'Hand-drawn art from across Africa, printed on cotton. From Africa, to you — Tai Manic Studios.',
};

// The streetwear hero's numbered pillars — the RAWBLOX "01–05" row, written to TAI's product.
const PILLARS = [
  'Hand-drawn originals',
  'From across Africa',
  'Printed on cotton',
  'Made to order',
  'Signed editions',
];

// The trust/feature strip (URBAN FIT · AURORA): four honest promises, not upsell noise.
const FEATURES = [
  { icon: PencilLine, title: 'Hand-drawn', sub: 'Every piece, by hand' },
  { icon: MapPin, title: 'From Africa', sub: 'Lagos · Addis · Accra · Cape Town' },
  { icon: Package, title: 'Made to order', sub: 'Printed when you buy' },
  { icon: Truck, title: 'Shipped nationwide', sub: 'Across Nigeria' },
];

export default async function HomePage() {
  const [{ items: artworks }, collectionSummaries] = await Promise.all([
    dataProvider.listArtworks({ limit: 8 }),
    dataProvider.listCollectionSummaries(),
  ]);

  // The night piece opens the page: a dark, atmospheric drawing carries the dark hero.
  const hero = artworks.find((a) => a.slug === 'midnight-in-lagos') ?? artworks[0];
  const drops = artworks.filter((a) => a.slug !== hero?.slug).slice(0, 3);
  const feature = artworks.filter((a) => a.slug !== hero?.slug).slice(3, 4)[0] ?? drops[0];
  const heroSrc = hero ? artworkImage(hero.slug) : null;
  const featureSrc = feature ? artworkImage(feature.slug) : null;

  // Shop-by-collection tiles need a cover; pull each collection's pieces and take a drawing we hold.
  const collectionDetails = await Promise.all(
    collectionSummaries.slice(0, 4).map((s) => dataProvider.getCollection(s.slug)),
  );
  const collections = collectionSummaries.slice(0, 4).map((summary, i) => ({
    summary,
    coverSlug:
      collectionDetails[i]?.artworks.find((a) => artworkImage(a.slug) !== null)?.slug ?? null,
  }));

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────────────────────
          A full-bleed dark stage with the headline set over the work, a shop CTA,
          and a numbered pillar row across the base. The copy staggers in on load. */}
      <section className="pt-4 sm:pt-6">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-neutral-950 text-white">
            {heroSrc ? (
              <Image
                src={heroSrc}
                alt={hero ? `${hero.title} — artwork` : ''}
                fill
                priority
                sizes="(min-width: 1536px) 1440px, 92vw"
                className="object-cover object-center opacity-80"
              />
            ) : null}
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
                  Tai Manic Studios
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
                  Hand-drawn art from Lagos, Addis, Accra and Cape Town — printed on cotton, made to
                  order. Own a piece of the continent, positioned the way the studio approved it.
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

              {/* Numbered pillar row — the RAWBLOX 01–05 strip; the last is "current". */}
              <Reveal
                as="ol"
                delay={320}
                className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/15 pt-6 sm:grid-cols-3 lg:grid-cols-5"
              >
                {PILLARS.map((label, i) => {
                  const current = i === PILLARS.length - 1;
                  return (
                    <li key={label} className={current ? 'text-white' : 'text-white/55'}>
                      <span className="font-display text-xs font-semibold tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <p className="mt-1 text-[0.8rem] leading-snug">{label}</p>
                    </li>
                  );
                })}
              </Reveal>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Feature strip (URBAN FIT · AURORA) ─────────────────────────────────── */}
      <section aria-label="Why Tai Manic Studios">
        <Container className="py-10">
          <Reveal className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, sub }) => (
              <div key={title} className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line text-ink">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-display text-sm font-bold uppercase tracking-wide text-ink">
                    {title}
                  </span>
                  <span className="block text-xs text-muted">{sub}</span>
                </span>
              </div>
            ))}
          </Reveal>
        </Container>
      </section>

      {/* ── Brand marquee (STRETKAT energy) ────────────────────────────────────── */}
      <section aria-hidden className="border-y border-line bg-neutral-950 py-5 text-white">
        <Marquee
          phrases={['From Africa, to you', 'Hand-drawn', 'Made to order', 'One continent']}
        />
      </section>

      {/* ── Shop by collection — arch tiles (CHICX · MEN'S essentials) ──────────── */}
      <section aria-labelledby="collections-title">
        <Container className="py-16 sm:py-20">
          <div className="flex items-end justify-between gap-4">
            <Reveal>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                The gallery
              </p>
              <h2
                id="collections-title"
                className="mt-2 font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl"
              >
                Shop by collection
              </h2>
            </Reveal>
            <Link
              href="/collections"
              className="hidden shrink-0 font-display text-xs font-semibold uppercase tracking-[0.12em] text-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] sm:inline"
            >
              All collections
            </Link>
          </div>

          <ul className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {collections.map(({ summary, coverSlug }, i) => {
              const src = coverSlug ? artworkImage(coverSlug) : null;
              return (
                <li key={summary.slug}>
                  <Reveal delay={i * 70}>
                    <Link
                      href={`/collections/${summary.slug}`}
                      className="group block rounded-t-[999px] rounded-b-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus-ring)]"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden rounded-t-[999px] rounded-b-2xl bg-neutral-950">
                        {src ? (
                          <Image
                            src={src}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 22vw, 45vw"
                            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none"
                          />
                        ) : null}
                        <div
                          aria-hidden
                          className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
                        />
                        <span className="absolute inset-x-0 bottom-5 text-center font-display text-lg font-bold uppercase tracking-tight text-white">
                          {summary.name}
                        </span>
                      </div>
                      <p className="mt-3 text-center text-xs text-muted">
                        {summary.artworkCount} {summary.artworkCount === 1 ? 'piece' : 'pieces'}
                      </p>
                    </Link>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      {/* ── New drops ──────────────────────────────────────────────────────────── */}
      <section aria-labelledby="drops-title" className="border-t border-line bg-canvas-2">
        <Container className="py-16 sm:py-20">
          <Reveal className="max-w-xl">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Fresh off the board
            </p>
            <h2
              id="drops-title"
              className="mt-2 font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl"
            >
              New drops
            </h2>
            <p className="mt-3 text-sm text-muted sm:text-base">
              The latest pieces off the drawing board — hand-drawn, printed to order. When a limited
              edition is gone, it's gone.
            </p>
          </Reveal>

          <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {drops.map((art, i) => {
              const src = artworkImage(art.slug);
              return (
                <li key={art.id}>
                  <Reveal delay={i * 70}>
                    <Link href={`/artworks/${art.slug}`} className="group block">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface">
                        {src ? (
                          <Image
                            src={src}
                            alt={`${art.title} — artwork`}
                            fill
                            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
                          />
                        ) : null}
                        <span className="absolute left-3 top-3 rounded-full bg-neutral-950 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white">
                          New
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="line-clamp-1 font-display text-sm font-bold uppercase tracking-wide text-ink">
                          {art.title}
                        </h3>
                        <div className="mt-1 flex items-baseline justify-between gap-2">
                          <p className="min-w-0 truncate text-xs text-muted">{art.collection}</p>
                          {art.startingPriceMinor !== null && art.currency ? (
                            <span className="shrink-0 font-display text-sm font-semibold text-ink">
                              <Price amountMinor={art.startingPriceMinor} currency={art.currency} />
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                </li>
              );
            })}
          </ul>

          <div className="mt-10">
            <Link href="/artworks" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
              See the whole gallery <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </Container>
      </section>

      {/* ── Made-to-order band (URBAN FIT offer split, kept honest) ─────────────── */}
      <section aria-label="How it's made">
        <Container className="py-16 sm:py-20">
          <Reveal className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-3xl bg-neutral-950 p-8 text-white sm:p-10">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                No waste
              </p>
              <p className="mt-3 font-display text-2xl font-bold uppercase leading-[1.02] tracking-tight sm:text-3xl">
                Made to order,
                <br />
                never marked down.
              </p>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
                Nothing sits in a warehouse waiting to be discounted. We print your piece when you
                order it, on heavyweight cotton — a little more patience, a lot less waste.
              </p>
            </div>
            <div className="flex flex-col justify-center rounded-3xl border border-line bg-canvas-2 p-8 sm:p-10">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                Studio-approved
              </p>
              <p className="mt-3 font-display text-2xl font-bold uppercase leading-[1.02] tracking-tight text-ink sm:text-3xl">
                Printed where the
                <br />
                piece was drawn to sit.
              </p>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
                Placement isn't a slider. Each drawing goes on the garment exactly where the studio
                approved it — curation, not configuration.
              </p>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── Editorial band — the studio invitation ─────────────────────────────── */}
      <section aria-labelledby="studio-title">
        <Container className="pb-20">
          <Reveal className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="relative aspect-[16/11] overflow-hidden rounded-3xl bg-canvas-2 lg:aspect-auto">
              {featureSrc ? (
                <Image
                  src={featureSrc}
                  alt={feature ? `${feature.title} — artwork` : ''}
                  fill
                  sizes="(min-width: 1024px) 46vw, 92vw"
                  className="object-cover"
                />
              ) : null}
            </div>

            <div className="flex flex-col justify-between gap-8 rounded-3xl bg-neutral-950 p-8 text-white sm:p-12">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-white/60">
                The Design Studio
              </p>
              <h2
                id="studio-title"
                className="font-display text-3xl font-bold uppercase leading-[0.98] tracking-tight sm:text-4xl"
              >
                From Africa,
                <br />
                made for you.
              </h2>
              <p className="max-w-sm text-sm leading-relaxed text-white/70">
                Every piece is drawn by hand and printed to order. Pick a drawing, put it on cotton,
                and wear the story.
              </p>
              <div>
                <PillLink
                  href="/design-studio"
                  tone="light"
                  icon={<ArrowUpRight className="size-4" aria-hidden />}
                >
                  Open the studio
                </PillLink>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
