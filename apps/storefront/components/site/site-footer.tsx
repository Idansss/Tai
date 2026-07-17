import { Container } from '@tms/ui';
import { ArrowRight, Instagram, Twitter } from 'lucide-react';
import Link from 'next/link';
import { footerNav } from '@/lib/nav';

/**
 * The footer, as a dark closing stage — it bookends the dark hero so the page opens and closes on
 * the same near-black note (docs/frontend/UI_DIRECTION.md §7). Structure blended from the
 * references: an oversized wordmark + newsletter on the left (HYPE BAY / Nextgen), the nav columns,
 * a social + payment row, and a quiet bottom bar.
 */

const SOCIALS = [
  { href: 'https://instagram.com', label: 'Instagram', icon: Instagram },
  { href: 'https://twitter.com', label: 'Twitter', icon: Twitter },
];

// Payment methods we accept, as plain wordmarks — honest, and no third-party logos to license.
const PAYMENTS = ['Visa', 'Mastercard', 'Verve', 'Flutterwave'];

export function SiteFooter() {
  return (
    <footer className="bg-neutral-950 text-white">
      <Container className="py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-sm">
            <span className="font-display text-3xl font-bold uppercase tracking-tight">
              Tai Manic
              <br />
              Studios
            </span>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              Hand-drawn art from across Africa, printed on cotton. From Africa, to you.
            </p>

            <form
              className="mt-8"
              aria-label="Newsletter signup"
              // Submission wiring lands with the CMS/newsletter endpoint (F5).
            >
              <label
                htmlFor="newsletter-email"
                className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-white/50"
              >
                Early access &amp; studio notes
              </label>
              <div className="mt-3 flex items-center gap-2 rounded-full border border-white/20 bg-white/5 py-1 pl-4 pr-1 focus-within:border-white/40">
                <input
                  id="newsletter-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="h-9 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-neutral-950 outline-none transition-transform hover:translate-x-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <ArrowRight className="size-4" aria-hidden />
                </button>
              </div>
            </form>
          </div>

          {footerNav.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                {group.heading}
              </p>
              <ul className="mt-4 space-y-3">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="rounded-sm text-sm text-white/70 outline-none transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-6 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {SOCIALS.map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noopener noreferrer"
                className="grid size-10 place-items-center rounded-full border border-white/20 text-white/80 outline-none transition-colors hover:border-white/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Icon className="size-4" aria-hidden />
              </a>
            ))}
          </div>
          <ul className="flex flex-wrap items-center gap-2">
            {PAYMENTS.map((method) => (
              <li
                key={method}
                className="rounded-md border border-white/15 px-2.5 py-1 text-[0.7rem] font-medium uppercase tracking-[0.06em] text-white/60"
              >
                {method}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 text-xs text-white/40 sm:flex-row">
          <span>© {new Date().getFullYear()} Tai Manic Studios. All rights reserved.</span>
          <span className="font-display uppercase tracking-[0.12em]">Made for the artwork</span>
        </div>
      </Container>
    </footer>
  );
}
