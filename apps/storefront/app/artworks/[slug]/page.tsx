import { Badge, buttonVariants, Container, Eyebrow, Frame, Heading, Price, Reveal, Text } from '@tms/ui';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArtworkCard } from '@/components/artwork/artwork-card';
import { ArtworkMedia } from '@/components/artwork/artwork-media';
import { CommunityBoard } from '@/components/community/community-board';
import { Reviews } from '@/components/review/reviews';
import { resolveArtworkImage } from '@/lib/artwork-images';
import { dataProvider } from '@/lib/data';

interface Params {
  params: Promise<{ slug: string }>;
}

// The artwork catalogue is a finite, enumerable set, so we statically generate
// every detail page and reject any slug outside it. `dynamicParams = false`
// makes an unknown slug a *genuine* 404 at the routing layer, resolved before
// any streaming begins, which fixes TMS-F1-DEF-001 (the soft 404 where the
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
  const image = resolveArtworkImage(slug);

  return (
    <>
      <Container width="wide" className="py-10 sm:py-12">
        <nav
          aria-label="Breadcrumb"
          className="font-mono text-xs uppercase tracking-[0.12em] text-muted"
        >
          <Link href="/artworks" className="rounded-sm transition-colors hover:text-ink">
            Artworks
          </Link>
          <span aria-hidden className="px-2 text-line-2">
            /
          </span>
          <span className="text-ink-2">{artwork.title}</span>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Gallery presentation — sticky on desktop so the work stays in view */}
          <div className="lg:col-span-7">
            <div className="lg:sticky lg:top-[5.5rem]">
              <Reveal from="none">
                <Frame ratio="artwork" interactive className="shadow-md">
                  <ArtworkMedia
                    src={image}
                    seed={artwork.slug}
                    title={artwork.title}
                    label={artwork.collection}
                    priority
                  />
                </Frame>
              </Reveal>
            </div>
          </div>

          <div className="lg:col-span-5">
            <Eyebrow>{artwork.collection}</Eyebrow>
            <Heading as={1} size="display-lg" className="mt-3">
              {artwork.title}
            </Heading>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Badge tone={artwork.limitedEdition ? 'warning' : 'neutral'}>
                {artwork.edition ?? 'Open edition'}
              </Badge>
              <span className="flex items-baseline gap-2">
                <span className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-muted">
                  from
                </span>
                <Price
                  amountMinor={artwork.startingPriceMinor}
                  currency={artwork.currency}
                  className="text-ink"
                />
              </span>
            </div>

            <Text size="lg" tone="secondary" className="mt-6">
              {artwork.story}
            </Text>

            <dl className="mt-8 divide-y divide-line border-y border-line text-sm">
              <div className="flex gap-4 py-3">
                <dt className="w-32 shrink-0 font-mono text-xs uppercase tracking-[0.1em] text-muted">
                  Inspiration
                </dt>
                <dd className="text-ink-2">{artwork.inspiration}</dd>
              </div>
              <div className="flex gap-4 py-3">
                <dt className="w-32 shrink-0 font-mono text-xs uppercase tracking-[0.1em] text-muted">
                  Available on
                </dt>
                <dd className="text-ink-2">{artwork.compatibleGarments.join(', ')}</dd>
              </div>
              {artwork.release ? (
                <div className="flex gap-4 py-3">
                  <dt className="w-32 shrink-0 font-mono text-xs uppercase tracking-[0.1em] text-muted">
                    Release
                  </dt>
                  <dd className="text-ink-2">{artwork.release}</dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/design-studio"
                className={buttonVariants({ size: 'lg', fullWidth: true })}
              >
                Design with this artwork <ArrowRight className="size-4" aria-hidden />
              </Link>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/artworks/${artwork.slug}/passport`}
                  className={buttonVariants({ size: 'lg', variant: 'secondary' })}
                >
                  <ShieldCheck className="size-4" aria-hidden /> View passport
                </Link>
                <Link
                  href="/artworks"
                  className={buttonVariants({ size: 'lg', variant: 'ghost' })}
                >
                  Back to gallery
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <Reviews targetType="artwork" targetLabel={artwork.title} initial={reviews} />
        </div>

        <section aria-labelledby="community-title" className="mt-16 border-t border-line pt-12">
          <Heading id="community-title" as={2} size="lg">
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
          <Container width="wide" className="py-16">
            <Eyebrow>More from the studio</Eyebrow>
            <Heading id="related-title" as={2} size="lg" className="mt-2">
              Related artwork
            </Heading>
            <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {artwork.related.map((art, i) => (
                <Reveal as="li" key={art.id} delay={(i % 4) * 60}>
                  <ArtworkCard artwork={art} />
                </Reveal>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}
    </>
  );
}
