import { Container, EmptyState, Eyebrow, Heading, Text } from '@tms/ui';
import type { Metadata } from 'next';
import { ArtworkCard } from '@/components/artwork/artwork-card';
import { dataProvider } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Artworks',
  description:
    'Browse original drawings and comic-line illustrations. The gallery leads; garments follow.',
};

export default async function ArtworksPage() {
  const { items: artworks } = await dataProvider.listArtworks({ limit: 24 });

  return (
    <Container className="py-14">
      <header>
        <Eyebrow>Gallery</Eyebrow>
        <Heading as={1} size="display-lg" className="mt-2">
          Artworks
        </Heading>
        <Text tone="secondary" className="mt-2">
          {artworks.length} {artworks.length === 1 ? 'piece' : 'pieces'} in view. Filtering and
          sorting arrive next in this phase.
        </Text>
      </header>

      {artworks.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="No artworks yet"
            description="New work is on its way. Check back soon."
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
