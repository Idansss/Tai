import { buttonVariants } from '@tms/ui';
import { Container, EmptyState } from '@tms/ui';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <Container className="py-24">
      <EmptyState
        title="We couldn't find that page"
        description="The page may have moved, or the link may be out of date."
        action={
          <Link href="/" className={buttonVariants()}>
            Back to home
          </Link>
        }
      />
    </Container>
  );
}
