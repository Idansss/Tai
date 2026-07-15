import type { Metadata } from 'next';
import { AdminLoginForm } from '@/components/admin-login-form';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLoginPage() {
  return <AdminLoginForm />;
}
