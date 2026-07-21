import { Container, EmptyState } from '@tms/ui';
import type { Metadata } from 'next';
import { ArtworkCard } from '@/components/artwork/artwork-card';
import { PageHeader } from '@/components/site/page-header';
import { Reveal } from '@/components/site/reveal';
import { dataProvider } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Browse every standalone artwork in the F.A.T.U collection.',
};

export default async function CollectionsPage() {
  const { items: artworks } = await dataProvider.listArtworks({ limit: 60 });

  return (
    <Container className="py-14">
      <PageHeader
        eyebrow="The gallery"
        title="Collections"
        lead={`${artworks.length} standalone artworks — drawings stay in Collections; clothing stays in Shop.`}
        contained={false}
      />

      {artworks.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="No artworks yet"
            description="New collection pieces are on their way."
          />
        </div>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-6 lg:grid-cols-3">
          {artworks.map((artwork, i) => (
            <li key={artwork.id}>
              <Reveal delay={Math.min(i, 5) * 60}>
                <ArtworkCard
                  artwork={artwork}
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
