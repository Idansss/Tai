import type { Metadata } from 'next';
import { AnalyticsView } from '@/components/analytics-view';

export const metadata: Metadata = {
  title: 'Analytics',
  robots: { index: false, follow: false, nocache: true },
};

export default function AnalyticsPage() {
  return <AnalyticsView />;
}
