import { Container } from '@tms/ui';
import type { Metadata } from 'next';
import { WishlistView } from '@/components/account/wishlist-view';

export const metadata: Metadata = {
  title: 'Wishlist',
  description: 'Pieces you’ve saved.',
  robots: { index: false, follow: false },
};

export default function WishlistPage() {
  return (
    <Container className="py-10">
      <WishlistView />
    </Container>
  );
}
