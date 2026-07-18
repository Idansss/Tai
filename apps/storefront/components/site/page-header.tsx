import { Container, cn } from '@tms/ui';
import type { ReactNode } from 'react';

/**
 * The standard page opening for the streetwear direction: a small uppercase eyebrow, a big bold
 * uppercase title, and an optional lead line — with room for an action on the right
 * (see docs/frontend/UI_DIRECTION.md §7). Used across the list and functional pages so every
 * surface opens the same way the landing page does.
 *
 * It renders its own <Container> and the page's single <h1> (as `<header>`), unless `as` overrides
 * the heading level for a section header.
 */
export function PageHeader({
  eyebrow,
  title,
  lead,
  action,
  as = 'h1',
  contained = true,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  /** Right-aligned action (a PillLink, a link, a filter control). */
  action?: ReactNode;
  as?: 'h1' | 'h2';
  /** Wrap in a Container. Set false when the caller already provides one. */
  contained?: boolean;
  className?: string;
}) {
  const Title = as;
  const inner = (
    <div
      className={cn('flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between', className)}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            {eyebrow}
          </p>
        ) : null}
        <Title
          className={cn(
            'font-display font-bold uppercase tracking-tight text-ink',
            eyebrow ? 'mt-3' : '',
            'text-4xl leading-[0.95] sm:text-5xl',
          )}
        >
          {title}
        </Title>
        {lead ? <p className="mt-4 text-sm text-muted sm:text-base">{lead}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );

  if (as === 'h1') {
    return contained ? (
      <Container>
        <header>{inner}</header>
      </Container>
    ) : (
      <header>{inner}</header>
    );
  }
  return contained ? <Container>{inner}</Container> : inner;
}
