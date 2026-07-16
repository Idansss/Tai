import { Container } from '@tms/ui';
import type { Metadata } from 'next';
import { ProfileView } from '@/components/account/profile-view';

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Your account details.',
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return (
    <Container className="py-10">
      <ProfileView />
    </Container>
  );
}
