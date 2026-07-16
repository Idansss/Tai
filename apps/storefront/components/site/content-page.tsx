import { buttonVariants, Container, Heading, Text } from '@tms/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface ContentSection {
  /** Section heading (rendered as an h2). Omit for an intro-only block. */
  heading?: string;
  /** Stable id for the section (also used as an in-page anchor target). */
  id?: string;
  body: ReactNode;
}

export interface ContentPageProps {
  eyebrow: string;
  title: string;
  /** Lead paragraph under the title. */
  intro: string;
  /** For policies, the last-updated date, shown under the intro. */
  updated?: string;
  sections?: ContentSection[];
  /** Extra content rendered after the sections (tables, forms, FAQs…). */
  children?: ReactNode;
}

/**
 * Shared editorial / policy page shell: landmarks, a single h1, a readable
 * measure, consistent section typography, and a way forward. Content is real
 * (no lorem); legal pages carry a "review before launch" note in their copy.
 */
export function ContentPage({
  eyebrow,
  title,
  intro,
  updated,
  sections = [],
  children,
}: ContentPageProps) {
  return (
    <Container width="wide" className="py-16 sm:py-24">
      <div className="max-w-2xl">
        <header>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{eyebrow}</p>
          <Heading as={1} size="display-lg" className="mt-3">
            {title}
          </Heading>
          <Text size="lg" tone="secondary" className="mt-4">
            {intro}
          </Text>
          {updated ? (
            <Text size="sm" tone="muted" className="mt-3 font-mono uppercase tracking-[0.1em]">
              Last updated {updated}
            </Text>
          ) : null}
        </header>

        {sections.length > 0 ? (
          <div className="mt-12 space-y-10">
            {sections.map((section, i) => (
              <section key={section.id ?? i} id={section.id} aria-labelledby={section.id}>
                {section.heading ? (
                  <Heading
                    as={2}
                    size="md"
                    id={section.id}
                    className="mb-3 border-t border-line pt-4 font-mono text-xs uppercase tracking-[0.12em] text-muted"
                  >
                    {section.heading}
                  </Heading>
                ) : null}
                <div className="space-y-3 leading-relaxed text-ink-2">{section.body}</div>
              </section>
            ))}
          </div>
        ) : null}

        {children ? <div className="mt-12">{children}</div> : null}

        <div className="mt-16 flex flex-wrap gap-3 border-t border-line pt-8">
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
