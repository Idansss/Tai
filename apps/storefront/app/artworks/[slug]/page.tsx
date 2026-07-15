import { Badge, buttonVariants, Container, Eyebrow, Heading, Price, Text } from '@tms/ui';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArtworkCard } from '@/components/artwork/artwork-card';
import { dataProvider } from '@/lib/data';

interface Params {
  params: Promise<{ slug: string }>;
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
          {/* Gallery presentation */}
          <div
            className="aspect-[4/5] w-full rounded-[var(--radius-lg)] border border-line bg-gradient-to-br from-canvas-2 to-surface-2"
            role="img"
            aria-label={`${artwork.title} — artwork presentation placeholder`}
          />

          <div>
            <Eyebrow>{artwork.collection}</Eyebrow>
            <Heading as={1} size="display-lg" className="mt-2">
              {artwork.title}
            </Heading>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Badge tone={artwork.limitedEdition ? 'warning' : 'neutral'}>
                {artwork.edition ?? 'Open edition'}
              </Badge>
              <Price
                amountMinor={artwork.startingPriceMinor}
                currency={artwork.currency}
                className="text-ink"
              />
              <span className="text-xs text-muted">from</span>
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
                href="/artworks"
                className={buttonVariants({ size: 'lg', variant: 'secondary' })}
              >
                Back to gallery
              </Link>
            </div>
          </div>
        </div>
      </Container>

      {artwork.related.length > 0 ? (
        <section aria-labelledby="related-title" className="border-t border-line bg-canvas-2">
          <Container className="py-14">
            <Eyebrow>More from the studio</Eyebrow>
            <Heading id="related-title" as={2} size="lg" className="mt-2">
              Related artwork
            </Heading>
            <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
