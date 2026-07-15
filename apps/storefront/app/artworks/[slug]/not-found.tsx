import { buttonVariants, Container, EmptyState } from '@tms/ui';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Artwork not found',
  robots: { index: false, follow: false },
};

export default function ArtworkNotFound() {
  return (
    <Container className="py-24">
      <EmptyState
        title="We couldn't find that artwork"
        description="It may have been archived, or the link may be out of date."
        action={
          <Link href="/artworks" className={buttonVariants()}>
            Back to the gallery
          </Link>
        }
      />
    </Container>
  );
}
