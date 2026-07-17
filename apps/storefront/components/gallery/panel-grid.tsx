import { cn } from '@tms/ui';
import type { ReactNode } from 'react';

/**
 * A comic page, used as a layout.
 *
 * The grid is taken from the artist's own composition rather than from a component library:
 * `four-corners-of-africa` is a 2×2 page with real gutters and a speech bubble, and the library
 * is full of quads and trios (`collection-quad`, `heritage-trio`, `flags-trio`). So the wall is
 * laid out the way the drawings are: panels on paper, separated by gutters.
 *
 * The gutter is the point. In a uniform card grid the gap is dead space between products; on a
 * comic page the gutter is paper, and it is what makes a panel a panel. That is the whole
 * difference between this and the marketplace grid it replaces (see docs/frontend/UI_DIRECTION.md).
 *
 * Panel size is pacing, not ranking. A comic's large panel is an establishing shot — the beat you
 * hold on — so the first panel of each page is wider. It says "start here", not "this is better".
 */

/**
 * One page of panels, in twelfths: an establishing panel and its partner, then a row of three.
 *
 *   ┌───────────────┬─────────┐
 *   │       7       │    5    │
 *   ├─────┬─────┬───┴─────────┤
 *   │  4  │  4  │      4      │
 *   └─────┴─────┴─────────────┘
 *
 * Five panels per page, each row summing to 12, so pages tile without ragged columns. An
 * incomplete last page simply flows — a real page is often short too.
 */
const PAGE = [
  { span: 'lg:col-span-7', twelfths: 7 },
  { span: 'lg:col-span-5', twelfths: 5 },
  { span: 'lg:col-span-4', twelfths: 4 },
  { span: 'lg:col-span-4', twelfths: 4 },
  { span: 'lg:col-span-4', twelfths: 4 },
] as const;

function panelAt(index: number) {
  return PAGE[index % PAGE.length] ?? PAGE[2];
}

/** Where this panel sits on its page. Positional, deterministic — never random. */
export function panelSpan(index: number): string {
  return panelAt(index).span;
}

/**
 * What to tell the browser about this panel's width.
 *
 * Panels are not the same size, so they cannot share one `sizes` hint: a seven-twelfths panel
 * given a four-twelfths hint would fetch an image too small and render it soft — the establishing
 * shot would be the blurriest thing on the page. Twelfths are converted to viewport width
 * assuming the page container occupies roughly 85vw at the large breakpoint.
 */
export function panelSizes(index: number): string {
  const wide = Math.round((panelAt(index).twelfths / 12) * 85);
  return `(min-width: 1024px) ${wide}vw, (min-width: 640px) 45vw, 90vw`;
}

export function PanelGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ul
      className={cn(
        // The gutter: paper between panels, wider than a card gap because it is structure, not
        // spacing. It grows with the viewport so the page keeps its proportions.
        'grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-14',
        className,
      )}
    >
      {children}
    </ul>
  );
}

export function Panel({
  index,
  children,
  className,
}: {
  index: number;
  children: ReactNode;
  className?: string;
}) {
  return <li className={cn(panelSpan(index), className)}>{children}</li>;
}
