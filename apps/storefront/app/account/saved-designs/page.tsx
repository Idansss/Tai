import { Container } from '@tms/ui';
import type { Metadata } from 'next';
import { SavedDesignsView } from '@/components/account/saved-designs-view';

export const metadata: Metadata = {
  title: 'Saved designs',
  description: 'Your saved Design Studio creations.',
  robots: { index: false, follow: false },
};

export default function SavedDesignsPage() {
  return (
    <Container className="py-10">
      <SavedDesignsView />
    </Container>
  );
}
