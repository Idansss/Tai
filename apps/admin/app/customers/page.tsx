import type { Metadata } from 'next';
import { SectionPlaceholder } from '@/components/section-placeholder';

export const metadata: Metadata = { title: 'Customers' };

export default function CustomersPage() {
  return (
    <SectionPlaceholder
      eyebrow="People"
      title="Customers"
      description="Customer directory with order history, saved designs, contact details and account status."
      task="TMS-F4-006"
    />
  );
}
