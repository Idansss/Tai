import { PlaceholderPage } from '@/components/site/placeholder-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Reach the studio for support, wholesale or press.',
};

export default function Page() {
  return (
    <PlaceholderPage
      eyebrow="Help"
      title="Contact"
      body="Reach the studio for support, wholesale or press."
      phase="F1"
    />
  );
}
