import type { Metadata } from 'next';
import { ConciergeAdminView } from '@/components/concierge-admin-view';

export const metadata: Metadata = {
  title: 'Concierge',
  description: 'AI customer-care conversations, tickets, knowledge, and metrics.',
};

export default function ConciergeAdminPage() {
  return <ConciergeAdminView />;
}
