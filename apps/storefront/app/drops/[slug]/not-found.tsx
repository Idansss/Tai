import { buttonVariants, Container, EmptyState } from '@tms/ui';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Drop not found',
  robots: { index: false, follow: false },
};

export default function DropNotFound() {
  return (
    <Container className="py-24">
      <EmptyState
        title="We couldn't find that drop"
        description="It may have closed, or the link may be out of date."
        action={
          <Link href="/drops" className={buttonVariants()}>
            Back to drops
          </Link>
        }
      />
    </Container>
  );
}
