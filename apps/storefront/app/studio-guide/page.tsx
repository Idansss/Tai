import { Container, Eyebrow, Heading, Text } from '@tms/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { StudioGuideChat } from '@/components/studio-guide/studio-guide-chat';

export const metadata: Metadata = {
  title: 'Studio Guide',
  description:
    'Chat with the Studio Guide — your AI assistant for the artworks, the Design Studio, sizing and policies.',
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
            Ask about the artworks, how the Design Studio works, sizing or our policies. For
            anything about a specific order, our{' '}
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
