import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@tms/ui';
import { ProductionView } from '@/components/production-view';

export const metadata: Metadata = {
  title: 'Production',
  robots: { index: false, follow: false, nocache: true },
};

export default function ProductionPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ProductionView />
    </Suspense>
  );
}
