import type { Metadata } from 'next';
import { GarmentsView } from '@/components/garments-view';

export const metadata: Metadata = {
  title: 'Garments',
  robots: { index: false, follow: false, nocache: true },
};

export default function GarmentsPage() {
  return <GarmentsView />;
}
