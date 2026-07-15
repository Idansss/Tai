import { PlaceholderPage } from '@/components/site/placeholder-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of service',
  description: 'The terms that apply when you use this site.',
};

export default function Page() {
  return (
    <PlaceholderPage
      eyebrow="Legal"
      title="Terms of service"
      body="The terms that apply when you use this site."
      phase="F1"
    />
  );
}
