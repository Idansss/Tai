import { Badge, buttonVariants, Container, Heading, Price, Text } from '@tms/ui';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArtworkCard } from '@/components/artwork/artwork-card';
import { CommunityBoard } from '@/components/community/community-board';
import { Reviews } from '@/components/review/reviews';
import { artworkImage } from '@/lib/artwork-images';
import { dataProvider } from '@/lib/data';

interface Params {
  params: Promise<{ slug: string }>;
}

// The artwork catalogue is a finite, enumerable set, so we statically generate
// every detail page and reject any slug outside it. `dynamicParams = false`
// makes an unknown slug a *genuine* 404 at the routing layer — resolved before
// any streaming begins — which fixes TMS-F1-DEF-001 (the soft 404 where the
// streamed shell committed HTTP 200 before notFound() resolved under Turbopack).
// When the real catalogue API lands (TMS-FBR-001), generateStaticParams will
// enumerate from it; switch to ISR (`dynamicParams = true` + `revalidate`) only
// if on-demand slugs must resolve without a rebuild.
export const dynamicParams = false;

export async function generateStaticParams() {
  const { items } = await dataProvider.listArtworks({ limit: 100 });
  return items.map((artwork) => ({ slug: artwork.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const artwork = await dataProvider.getArtwork(slug);
  if (!artwork) notFound();
  return {
    title: artwork.title,
    description: artwork.shortStory,
    openGraph: { title: artwork.title, description: artwork.shortStory },
  };
}

export default async function ArtworkDetailPage({ params }: Params) {
  const { slug } = await params;
  const artwork = await dataProvider.getArtwork(slug);
  if (!artwork) notFound();
  const reviews = await dataProvider.getReviews('artwork', slug);
  const communityPhotos = await dataProvider.listArtworkCommunityPhotos(slug);

  return (
    <>
      <Container className="py-10">
        <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.08em] text-muted">
          <Link href="/artworks" className="rounded-sm hover:text-ink">
            Artworks
          </Link>
          <span aria-hidden> / </span>
          <span className="text-ink-2">{artwork.title}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          {/* The work, uncropped and in colour — the whole reason for the page. */}
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-line bg-canvas-2">
            {artworkImage(artwork.slug) ? (
              <Image
                src={artworkImage(artwork.slug) as string}
                alt={`${artwork.title} — artwork`}
                fill
                priority
                sizes="(min-width: 1024px) 45vw, 92vw"
                className="object-cover"
              />
            ) : null}
          </div>

          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              {artwork.collection}
            </p>
            <h1 className="mt-2 font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-ink sm:text-5xl">
              {artwork.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Badge tone={artwork.limitedEdition ? 'warning' : 'neutral'}>
                {artwork.edition ?? 'Open edition'}
              </Badge>
              {artwork.startingPriceMinor !== null && artwork.currency ? (
                <>
                  <Price
                    amountMinor={artwork.startingPriceMinor}
                    currency={artwork.currency}
                    className="text-ink"
                  />
                  <span className="text-xs text-muted">from</span>
                </>
              ) : null}
            </div>

            <Text size="lg" tone="secondary" className="mt-6">
              {artwork.story}
            </Text>

            <dl className="mt-6 space-y-3 border-t border-line pt-6 text-sm">
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-muted">Inspiration</dt>
                <dd className="text-ink-2">{artwork.inspiration}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-muted">Available on</dt>
                <dd className="text-ink-2">{artwork.compatibleGarments.join(', ')}</dd>
              </div>
              {artwork.release ? (
                <div className="flex gap-3">
                  <dt className="w-32 shrink-0 text-muted">Release</dt>
                  <dd className="text-ink-2">{artwork.release}</dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/design-studio" className={buttonVariants({ size: 'lg' })}>
                Design with this artwork <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href={`/artworks/${artwork.slug}/passport`}
                className={buttonVariants({ size: 'lg', variant: 'secondary' })}
              >
                <ShieldCheck className="size-4" aria-hidden /> View passport
              </Link>
              <Link href="/artworks" className={buttonVariants({ size: 'lg', variant: 'ghost' })}>
                Back to gallery
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-14">
          <Reviews targetType="artwork" targetLabel={artwork.title} initial={reviews} />
        </div>

        <section aria-labelledby="community-title" className="mt-14 border-t border-line pt-10">
          <Heading id="community-title" as={2} size="md">
            Styled by the community
          </Heading>
          <Text tone="secondary" className="mt-1">
            How people are wearing {artwork.title}.
          </Text>
          <div className="mt-6">
            <CommunityBoard
              initialPhotos={communityPhotos}
              artworks={[]}
              fixedArtwork={{ slug: artwork.slug, title: artwork.title }}
              emptyLabel={`Be the first to share how you style ${artwork.title}.`}
            />
          </div>
        </section>
      </Container>

      {artwork.related.length > 0 ? (
        <section aria-labelledby="related-title" className="border-t border-line bg-canvas-2">
          <Container className="py-14">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              More from the studio
            </p>
            <h2
              id="related-title"
              className="mt-2 font-display text-2xl font-bold uppercase tracking-tight text-ink sm:text-3xl"
            >
              Related artwork
            </h2>
            <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-6 lg:grid-cols-3">
              {artwork.related.map((art) => (
                <li key={art.id}>
                  <ArtworkCard artwork={art} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}
    </>
  );
}
