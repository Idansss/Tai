import { Container } from '@tms/ui';
import type { Metadata } from 'next';
import { CommunityBoard } from '@/components/community/community-board';
import { PageHeading } from '@/components/site/page-heading';
import { dataProvider } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Community gallery',
  description: 'See how the community styles their pieces, and share your own photo.',
};

export default async function CommunityPage() {
  const [photos, artworkPage] = await Promise.all([
    dataProvider.listCommunityPhotos(),
    dataProvider.listArtworks({ limit: 100 }),
  ]);
  const artworks = artworkPage.items.map((a) => ({ slug: a.slug, title: a.title }));

  return (
    <Container width="wide" className="py-14 sm:py-16">
      <PageHeading
        eyebrow="Community"
        index={1}
        title="Styled by you"
        lead="Photos from people wearing their pieces out in the world. Share yours and, once our team has had a look, it joins the gallery."
      />

      <div className="mt-12">
        <CommunityBoard
          initialPhotos={photos}
          artworks={artworks}
          emptyLabel="Be the first to share how you style a piece."
        />
      </div>
    </Container>
  );
}
