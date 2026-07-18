import { buttonVariants, Container, EmptyState } from '@tms/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArtworkCard } from '@/components/artwork/artwork-card';
import { ArtworkFilters } from '@/components/gallery/artwork-filters';
import { PageHeader } from '@/components/site/page-header';
import { Reveal } from '@/components/site/reveal';
import { dataProvider } from '@/lib/data';
import { hasActiveFilters, parseArtworkFilters } from '@/lib/gallery-params';

export const metadata: Metadata = {
  title: 'Artworks',
  description:
    'Browse original hand-drawn art from across Africa. The gallery leads; garments follow.',
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
      <PageHeader
        eyebrow="The gallery"
        title="Artworks"
        lead={`${artworks.length} ${artworks.length === 1 ? 'piece' : 'pieces'}${
          active ? ' match your filters' : ' in view'
        } — hand-drawn, printed to order.`}
        contained={false}
      />

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
        <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-6 lg:grid-cols-3">
          {artworks.map((art, i) => (
            <li key={art.id}>
              {/* Stagger caps at the first row or two — a long ripple down a full page reads slow. */}
              <Reveal delay={Math.min(i, 5) * 60}>
                <ArtworkCard
                  artwork={art}
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 50vw"
                  priority={i < 2}
                />
              </Reveal>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
