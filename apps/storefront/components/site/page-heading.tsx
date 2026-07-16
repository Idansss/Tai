import { Reveal, SectionIndex } from '@tms/ui';
import type { ReactNode } from 'react';

export interface PageHeadingProps {
  /** Uppercase mono eyebrow, e.g. "Gallery". */
  eyebrow: string;
  title: ReactNode;
  /** Optional 1-based section index rendered as a mono marker. */
  index?: number;
  /** Lead paragraph under the title. */
  lead?: ReactNode;
  /** Short meta line (e.g. a count), rendered in mono. */
  meta?: ReactNode;
  /** Right-aligned actions (links/buttons). */
  actions?: ReactNode;
  /** Heading id for aria-labelledby wiring. */
  titleId?: string;
}

/**
 * Editorial route header (Gallery Press rhythm): optional numbered index + mono eyebrow, an
 * oversized display title, an optional lead and meta, and optional right-aligned actions.
 * Used across storefront index routes so every page opens with the same composed masthead.
 */
export function PageHeading({
  eyebrow,
  title,
  index,
  lead,
  meta,
  actions,
  titleId,
}: PageHeadingProps) {
  return (
    <Reveal as="header" className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-4">
        {typeof index === 'number' ? <SectionIndex index={index} className="mt-2.5" /> : null}
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{eyebrow}</p>
          <h1
            id={titleId}
            className="mt-3 font-display text-4xl font-semibold tracking-[-0.01em] text-ink sm:text-5xl"
          >
            {title}
          </h1>
          {lead ? <p className="mt-4 max-w-prose text-lg leading-relaxed text-ink-2">{lead}</p> : null}
          {meta ? (
            <p className="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-muted">{meta}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </Reveal>
  );
}
