import { buttonVariants, Container, EmptyState, Eyebrow, Heading, Text } from '@tms/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArtworkCard } from '@/components/artwork/artwork-card';
import { ArtworkFilters } from '@/components/gallery/artwork-filters';
import { dataProvider } from '@/lib/data';
import { hasActiveFilters, parseArtworkFilters } from '@/lib/gallery-params';

export const metadata: Metadata = {
  title: 'Artworks',
  description:
    'Browse original drawings and comic-line illustrations. The gallery leads; garments follow.',
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ArtworksPage({ searchParams }: PageProps) {
  const filters = parseArtworkFilters(await searchParams);
  const [{ items: artworks }, collections] = await Promise.all([
    dataProvider.listArtworks({
      collection: filters.collection,
      availability: filters.availability,
      sort: filters.sort,
      limit: 24,
    }),
    dataProvider.listCollections(),
  ]);

  const active = hasActiveFilters(filters);

  return (
    <Container className="py-14">
      <header>
        <Eyebrow>Gallery</Eyebrow>
        <Heading as={1} size="display-lg" className="mt-2">
          Artworks
        </Heading>
        <Text tone="secondary" className="mt-2">
          {artworks.length} {artworks.length === 1 ? 'piece' : 'pieces'}
          {active ? ' match your filters' : ' in view'}.
        </Text>
      </header>

      <div className="mt-8">
        <ArtworkFilters collections={collections} filters={filters} />
      </div>

      {artworks.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No artworks match those filters"
            description="Try a different collection or availability."
            action={
              <Link href="/artworks" className={buttonVariants({ variant: 'secondary' })}>
                Clear filters
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {artworks.map((art) => (
            <li key={art.id}>
              <ArtworkCard artwork={art} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
