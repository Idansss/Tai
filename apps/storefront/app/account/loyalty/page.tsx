import { Container } from '@tms/ui';
import type { Metadata } from 'next';
import { LoyaltyView } from '@/components/account/loyalty-view';

export const metadata: Metadata = {
  title: 'Loyalty & referrals',
  description: 'Your points, rewards and referral link.',
  robots: { index: false, follow: false },
};

export default function LoyaltyPage() {
  return (
    <Container className="py-10">
      <LoyaltyView />
    </Container>
  );
}
