import { Container, Eyebrow, Heading, Text } from '@tms/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { StudioGuideChat } from '@/components/studio-guide/studio-guide-chat';

export const metadata: Metadata = {
  title: 'Studio Guide',
  description:
    'Chat with the F.A.T.U Concierge — artwork, Design Studio, sizing, delivery, and orders.',
};

export default function StudioGuidePage() {
  return (
    <Container className="py-10">
      <div className="mx-auto max-w-2xl">
        <div className="max-w-xl">
          <Eyebrow>Help</Eyebrow>
          <Heading as={1} size="display-lg" className="mt-2">
            Studio Guide
          </Heading>
          <Text size="lg" tone="secondary" className="mt-3">
            The site-wide <strong className="font-medium text-ink">F.A.T.U Concierge</strong>{' '}
            (launcher on every page) is the primary assistant. This page keeps the original Studio
            Guide preview chat. For a specific order, our{' '}
            <Link
              href="/contact"
              className="rounded-sm text-accent underline underline-offset-2 hover:text-ink"
            >
              team
            </Link>{' '}
            can help directly.
          </Text>
        </div>

        <div className="mt-8">
          <StudioGuideChat />
        </div>
      </div>
    </Container>
  );
}
