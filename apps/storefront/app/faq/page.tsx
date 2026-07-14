import { PlaceholderPage } from '@/components/site/placeholder-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Answers to the questions we are asked most often.',
};

export default function Page() {
  return (
    <PlaceholderPage
      eyebrow="Help"
      title="FAQ"
      body="Answers to the questions we are asked most often."
      phase="F1"
    />
  );
}
