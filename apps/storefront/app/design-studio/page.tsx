import { Container } from '@tms/ui';
import type { Metadata } from 'next';
import { DesignStudio } from '@/components/studio/design-studio';
import { PageHeader } from '@/components/site/page-header';
import { dataProvider, type StudioOptions } from '@/lib/data';
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
  const { items: artworks } = await dataProvider.listArtworks({ limit: 24 });

  // Approved placements are per artwork+garment pair (ADR-013), so there is nothing to fetch
  // until an artwork is chosen. Choosing one navigates here again with ?artwork=, which is what
  // loads that artwork's approved canvases.
  const options: StudioOptions = initialConfig.artwork
    ? await dataProvider.getStudioOptions(initialConfig.artwork)
    : { garments: [] };

  return (
    <Container className="py-10">
      <div className="mb-8">
        <PageHeader
          eyebrow="Interactive"
          title="Design Studio"
          lead="Choose an artwork, then make it yours — garment, colour, size, placement and scale, with a live preview. Placement is the studio's approved decision; you pick from it. Share your design or save it for checkout."
          contained={false}
        />
      </div>

      <DesignStudio artworks={artworks} options={options} initialConfig={initialConfig} />
    </Container>
  );
}
