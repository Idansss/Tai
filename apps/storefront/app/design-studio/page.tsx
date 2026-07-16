import { Container } from '@tms/ui';
import type { Metadata } from 'next';
import { PageHeading } from '@/components/site/page-heading';
import { DesignStudio } from '@/components/studio/design-studio';
import { dataProvider } from '@/lib/data';
import { parseStudioParams } from '@/lib/studio';

export const metadata: Metadata = {
  title: 'Design Studio',
  description: 'Choose an artwork, garment, colour, size and placement with a live preview.',
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DesignStudioPage({ searchParams }: PageProps) {
  const initialConfig = parseStudioParams(await searchParams);
  const [{ items: artworks }, options] = await Promise.all([
    dataProvider.listArtworks({ limit: 24 }),
    dataProvider.getStudioOptions(),
  ]);

  return (
    <Container width="wide" className="py-12 sm:py-16">
      <div className="mb-8">
        <PageHeading
          eyebrow="Interactive"
          index={0}
          title="Design Studio"
          lead="Choose an artwork, then make it yours: garment, colour, size, placement and scale, with a live preview at every step. Share your design or save it for checkout."
        />
      </div>

      <DesignStudio artworks={artworks} options={options} initialConfig={initialConfig} />
    </Container>
  );
}
