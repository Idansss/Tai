import { buttonVariants, Container, Eyebrow, Heading, Text } from '@tms/ui';
import Link from 'next/link';

export interface PlaceholderPageProps {
  eyebrow: string;
  title: string;
  body: string;
  /** Phase this section is scheduled for, shown as a small note. */
  phase?: string;
}

/**
 * Real, accessible page shell for routes whose full content arrives in a later
 * phase. Keeps landmarks, a single h1, metadata (set per route), and a way
 * forward — so navigation never dead-ends on a 404.
 */
export function PlaceholderPage({ eyebrow, title, body, phase }: PlaceholderPageProps) {
  return (
    <Container className="py-20 sm:py-28">
      <div className="max-w-2xl">
        <Eyebrow>{eyebrow}</Eyebrow>
        <Heading as={1} size="display-lg" className="mt-3">
          {title}
        </Heading>
        <Text size="lg" tone="secondary" className="mt-4">
          {body}
        </Text>
        {phase ? (
          <Text size="sm" tone="muted" className="mt-3">
            This section is being built in phase {phase}.
          </Text>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className={buttonVariants({ variant: 'secondary' })}>
            Back to home
          </Link>
          <Link href="/artworks" className={buttonVariants({ variant: 'ghost' })}>
            Browse artworks
          </Link>
        </div>
      </div>
    </Container>
  );
}
