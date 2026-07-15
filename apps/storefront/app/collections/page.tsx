import { Container, EmptyState, Eyebrow, Heading, Text } from '@tms/ui';
import type { Metadata } from 'next';
import { CollectionCard } from '@/components/collection/collection-card';
import { dataProvider } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Curated bodies of work, grouped by theme and season.',
};

export default async function CollectionsPage() {
  const collections = await dataProvider.listCollectionSummaries();

  return (
    <Container className="py-14">
      <header>
        <Eyebrow>Gallery</Eyebrow>
        <Heading as={1} size="display-lg" className="mt-2">
          Collections
        </Heading>
        <Text tone="secondary" className="mt-2">
          Curated bodies of work, grouped by theme and season.
        </Text>
      </header>

      {collections.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="No collections yet" description="New collections are on their way." />
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <li key={collection.slug}>
              <CollectionCard collection={collection} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
