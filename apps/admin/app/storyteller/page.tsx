import type { Metadata } from 'next';
import { BrandStorytellerView } from '@/components/brand-storyteller-view';

export const metadata: Metadata = { title: 'Brand Storyteller' };

export default function StorytellerPage() {
  return <BrandStorytellerView />;
}
