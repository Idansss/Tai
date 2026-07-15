import { buttonVariants, EmptyState } from '@tms/ui';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Not found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <EmptyState
      title="Section not found"
      description="That admin view doesn't exist."
      action={
        <Link href="/" className={buttonVariants({ variant: 'secondary' })}>
          Back to dashboard
        </Link>
      }
    />
  );
}
