import { buttonVariants, Container, EmptyState, Reveal } from '@tms/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArtworkCard } from '@/components/artwork/artwork-card';
import { ArtworkFilters } from '@/components/gallery/artwork-filters';
import { PageHeading } from '@/components/site/page-heading';
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
    <Container width="wide" className="py-14 sm:py-16">
      <PageHeading
        eyebrow="Gallery"
        index={1}
        title="Artworks"
        titleId="artworks-title"
        lead="Original drawings and comic-line illustrations. The gallery leads; the garments follow."
        meta={`${artworks.length} ${artworks.length === 1 ? 'piece' : 'pieces'}${
          active ? ' match your filters' : ' in view'
        }`}
      />

      <div className="sticky top-[4rem] z-30 mt-10 border-y border-line bg-canvas/85 py-4 backdrop-blur-md lg:top-[4.5rem]">
        <ArtworkFilters collections={collections} filters={filters} />
      </div>

      {artworks.length === 0 ? (
        <div className="mt-16">
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
        <ul
          aria-labelledby="artworks-title"
          className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4"
        >
          {artworks.map((art, i) => (
            <Reveal as="li" key={art.id} delay={(i % 4) * 60}>
              <ArtworkCard artwork={art} />
            </Reveal>
          ))}
        </ul>
      )}
    </Container>
  );
}
