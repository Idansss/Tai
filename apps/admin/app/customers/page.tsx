import type { Metadata } from 'next';
import { CustomersView } from '@/components/customers-view';

export const metadata: Metadata = {
  title: 'Customers',
  robots: { index: false, follow: false, nocache: true },
};

export default function CustomersPage() {
  return <CustomersView />;
}
