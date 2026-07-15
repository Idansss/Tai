import type { Metadata } from 'next';
import { ErrorCentreView } from '@/components/error-centre-view';

export const metadata: Metadata = {
  title: 'Error centre',
  robots: { index: false, follow: false, nocache: true },
};

export default function ErrorsPage() {
  return <ErrorCentreView />;
}
