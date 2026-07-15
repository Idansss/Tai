import { Container } from '@tms/ui';
import type { Metadata } from 'next';
import { AccountOverview } from '@/components/account/account-overview';

export const metadata: Metadata = {
  title: 'Your account',
  description: 'Manage your account and orders.',
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <Container className="py-10">
      <AccountOverview />
    </Container>
  );
}
