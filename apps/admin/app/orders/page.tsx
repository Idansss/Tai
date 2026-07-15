import type { Metadata } from 'next';
import { SectionPlaceholder } from '@/components/section-placeholder';

export const metadata: Metadata = { title: 'Orders' };

export default function OrdersPage() {
  return (
    <SectionPlaceholder
      eyebrow="Fulfilment"
      title="Orders"
      description="Searchable order table with filters, pagination, order detail, payment and shipment detail, status timeline, internal notes and fulfilment actions."
      task="TMS-F4-002"
    />
  );
}
