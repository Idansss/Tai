import { Container } from '@tms/ui';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/components/account/auth-form';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Tai Manic Studios account.',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Container className="py-12">
      <Suspense fallback={null}>
        <AuthForm mode="login" />
      </Suspense>
    </Container>
  );
}
