import { buttonVariants, Container, EmptyState } from '@tms/ui';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Product not found',
  robots: { index: false, follow: false },
};

export default function ProductNotFound() {
  return (
    <Container className="py-24">
      <EmptyState
        title="We couldn't find that product"
        description="It may have sold out or been retired."
        action={
          <Link href="/shop" className={buttonVariants()}>
            Back to the shop
          </Link>
        }
      />
    </Container>
  );
}
