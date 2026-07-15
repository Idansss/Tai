import { Container } from '@tms/ui';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/components/account/auth-form';

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create a Tai Manic Studios account.',
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <Container className="py-12">
      <Suspense fallback={null}>
        <AuthForm mode="register" />
      </Suspense>
    </Container>
  );
}
