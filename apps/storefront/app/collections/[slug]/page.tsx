import { Container, Eyebrow, Frame, Heading, Reveal, Text } from '@tms/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArtworkCard } from '@/components/artwork/artwork-card';
import { ArtworkVisual } from '@/components/artwork/artwork-visual';
import { dataProvider } from '@/lib/data';

interface Params {
  params: Promise<{ slug: string }>;
}

// Finite, enumerable catalogue: statically generate every collection page and
// reject anything else. `dynamicParams = false` makes an unknown slug a genuine
// 404 (fallback:false → real 404 status on static/CDN hosting), which is the
// idiomatic Next fix for the soft-404 tracked as TMS-F1-DEF-001. When the
// catalogue API lands (TMS-FBR-001), enumerate from it here; switch to ISR only
// if slugs must resolve without a rebuild.
export const dynamicParams = false;

export async function generateStaticParams() {
  const collections = await dataProvider.listCollectionSummaries();
  return collections.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const collection = await dataProvider.getCollection(slug);
  if (!collection) notFound();
  return {
    title: collection.name,
    description: collection.description,
    openGraph: { title: collection.name, description: collection.description },
  };
}

export default async function CollectionDetailPage({ params }: Params) {
  const { slug } = await params;
  const collection = await dataProvider.getCollection(slug);
  if (!collection) notFound();

  return (
    <Container width="wide" className="py-12 sm:py-16">
      <nav
        aria-label="Breadcrumb"
        className="font-mono text-xs uppercase tracking-[0.12em] text-muted"
      >
        <Link href="/collections" className="rounded-sm transition-colors hover:text-ink">
          Collections
        </Link>
        <span aria-hidden className="px-2 text-line-2">
          /
        </span>
        <span className="text-ink-2">{collection.name}</span>
      </nav>

      <Reveal className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-end">
        <header className="lg:col-span-6">
          <Eyebrow>
            {collection.artworkCount} {collection.artworkCount === 1 ? 'piece' : 'pieces'}
          </Eyebrow>
          <Heading as={1} size="display-lg" className="mt-3">
            {collection.name}
          </Heading>
          <Text size="lg" tone="secondary" className="mt-4 max-w-prose">
            {collection.description}
          </Text>
        </header>
        <div className="lg:col-span-6">
          <Frame ratio="collection" mat="canvas">
            <ArtworkVisual
              seed={`collection-${collection.slug}`}
              title={collection.name}
              label={collection.name}
            />
          </Frame>
        </div>
      </Reveal>

      <ul className="mt-14 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
        {collection.artworks.map((art, i) => (
          <Reveal as="li" key={art.id} delay={(i % 4) * 60}>
            <ArtworkCard artwork={art} />
          </Reveal>
        ))}
      </ul>
    </Container>
  );
}
