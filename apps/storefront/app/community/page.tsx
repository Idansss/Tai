import { Container, Eyebrow, Heading, Text } from '@tms/ui';
import type { Metadata } from 'next';
import { CommunityBoard } from '@/components/community/community-board';
import { dataProvider } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Community gallery',
  description: 'See how the community styles their pieces — and share your own photo.',
};

export default async function CommunityPage() {
  const [photos, artworkPage] = await Promise.all([
    dataProvider.listCommunityPhotos(),
    dataProvider.listArtworks({ limit: 100 }),
  ]);
  const artworks = artworkPage.items.map((a) => ({ slug: a.slug, title: a.title }));

  return (
    <Container className="py-10">
      <div className="max-w-2xl">
        <Eyebrow>Community</Eyebrow>
        <Heading as={1} size="display-lg" className="mt-2">
          Styled by you
        </Heading>
        <Text size="lg" tone="secondary" className="mt-3">
          Photos from people wearing their pieces out in the world. Share yours and, once our team
          has had a look, it joins the gallery.
        </Text>
      </div>

      <div className="mt-10">
        <CommunityBoard
          initialPhotos={photos}
          artworks={artworks}
          emptyLabel="Be the first to share how you style a piece."
        />
      </div>
    </Container>
  );
}
