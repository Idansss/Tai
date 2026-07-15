import { buttonVariants, Container, EmptyState } from '@tms/ui';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Collection not found',
  robots: { index: false, follow: false },
};

export default function CollectionNotFound() {
  return (
    <Container className="py-24">
      <EmptyState
        title="We couldn't find that collection"
        description="It may have been renamed, or the link may be out of date."
        action={
          <Link href="/collections" className={buttonVariants()}>
            Back to collections
          </Link>
        }
      />
    </Container>
  );
}
