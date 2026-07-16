import { Container, Eyebrow } from '@tms/ui';
import Link from 'next/link';
import { footerNav } from '@/lib/nav';

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-canvas-2">
      <Container width="wide" className="py-16">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_repeat(4,1fr)]">
          <div className="max-w-sm">
            <span className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              Tai Manic Studios
            </span>
            <p className="mt-3 text-sm text-muted">
              Original drawings and comic-line illustrations, applied to considered apparel.
            </p>
            <form
              className="mt-6"
              aria-label="Newsletter signup"
              // Submission wiring lands with the CMS/newsletter endpoint (F5).
            >
              <label htmlFor="newsletter-email" className="text-xs font-medium text-ink-2">
                Early access &amp; studio notes
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="newsletter-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-md border border-line-2 bg-surface px-3 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                />
                <button
                  type="submit"
                  className="h-11 shrink-0 rounded-md bg-accent px-4 text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                >
                  Subscribe
                </button>
              </div>
            </form>
          </div>

          {footerNav.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <Eyebrow>{group.heading}</Eyebrow>
              <ul className="mt-4 space-y-2">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="rounded-sm text-sm text-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-2 border-t border-line pt-6 font-mono text-xs uppercase tracking-[0.1em] text-muted sm:flex-row">
          <span>© {new Date().getFullYear()} Tai Manic Studios</span>
          <span>Made for the artwork</span>
        </div>
      </Container>
    </footer>
  );
}
