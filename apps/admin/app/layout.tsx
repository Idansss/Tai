import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import Link from 'next/link';
import { Boxes, Factory, LayoutDashboard, Palette, ShoppingBag, TriangleAlert } from 'lucide-react';
import './globals.css';

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Admin · Tai Manic Studios', template: '%s · TMS Admin' },
  description: 'Operational console for Tai Manic Studios.',
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  themeColor: '#121316',
  width: 'device-width',
  initialScale: 1,
};

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/artworks', label: 'Artworks', icon: Palette },
  { href: '/garments', label: 'Garments', icon: Boxes },
  { href: '/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/production', label: 'Production', icon: Factory },
  { href: '/errors', label: 'Error centre', icon: TriangleAlert },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh bg-canvas-2 text-ink antialiased">
        <div className="flex min-h-dvh">
          <aside className="hidden w-60 shrink-0 border-r border-line bg-surface md:block">
            <div className="flex h-16 items-center border-b border-line px-5">
              <span className="font-display text-sm font-semibold tracking-tight">TMS Admin</span>
            </div>
            <nav className="p-3" aria-label="Admin sections">
              <ul className="space-y-1">
                {nav.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-2 hover:bg-canvas-2 hover:text-ink"
                    >
                      <Icon className="size-4" aria-hidden />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-5">
              <span className="font-display text-sm font-medium md:hidden">TMS Admin</span>
              <span className="text-xs uppercase tracking-[0.08em] text-muted">
                Operational console
              </span>
            </header>
            <main id="main" className="flex-1 p-5 sm:p-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
