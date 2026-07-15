import type { Metadata } from 'next';
import { SectionPlaceholder } from '@/components/section-placeholder';

export const metadata: Metadata = { title: 'Error centre' };

export default function ErrorsPage() {
  return (
    <SectionPlaceholder
      eyebrow="Operations"
      title="Error centre"
      description="Payment, webhook, shipping, image-processing, email, AI and background-job failures with correlation ID, affected order, retry action and resolution state. Never shows stack traces or secrets."
      task="TMS-F4-006"
    />
  );
}
