import { Container, Eyebrow, Heading, Text } from '@tms/ui';
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
    <Container className="py-14">
      <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.08em] text-muted">
        <Link href="/collections" className="rounded-sm hover:text-ink">
          Collections
        </Link>
        <span aria-hidden> / </span>
        <span className="text-ink-2">{collection.name}</span>
      </nav>

      <header className="mt-6 max-w-2xl">
        <Eyebrow>
          {collection.artworkCount} {collection.artworkCount === 1 ? 'piece' : 'pieces'}
        </Eyebrow>
        <Heading as={1} size="display-lg" className="mt-2">
          {collection.name}
        </Heading>
        <Text size="lg" tone="secondary" className="mt-4">
          {collection.description}
        </Text>
      </header>

      <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {collection.artworks.map((art) => (
          <li key={art.id}>
            <ArtworkCard artwork={art} />
          </li>
        ))}
      </ul>
    </Container>
  );
}
