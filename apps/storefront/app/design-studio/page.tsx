import { Container, Eyebrow, Heading, Text } from '@tms/ui';
import type { Metadata } from 'next';
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
    <Container className="py-10">
      <header className="mb-6 max-w-2xl">
        <Eyebrow>Interactive</Eyebrow>
        <Heading as={1} size="display-lg" className="mt-2">
          Design Studio
        </Heading>
        <Text tone="secondary" className="mt-2">
          Choose an artwork, then make it yours — garment, colour, size, placement and scale, with a
          live preview. Share your design or save it for checkout.
        </Text>
      </header>

      <DesignStudio artworks={artworks} options={options} initialConfig={initialConfig} />
    </Container>
  );
}
