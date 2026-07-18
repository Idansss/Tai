import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import { AuthProvider } from '@/components/account/auth-provider';
import { WishlistProvider } from '@/components/account/wishlist-provider';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { CartProvider } from '@/components/cart/cart-provider';
import { isCartServerBacked } from '@/lib/cart-api';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
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
  metadataBase: new URL('https://fromafricatoyou.com'),
  title: {
    default: 'From Africa To You — Art-led apparel',
    template: '%s · From Africa To You',
  },
  description:
    'Hand-drawn art from across Africa — coloured pencil and marker on paper, printed on cotton. A premium digital gallery and interactive design studio.',
  openGraph: {
    type: 'website',
    siteName: 'From Africa To You',
    title: 'From Africa To You — Art-led apparel',
    description: 'A premium digital art gallery and interactive clothing-design experience.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#fafaf7',
  // Do not restrict zoom (accessibility): omit maximumScale / userScalable.
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh bg-canvas text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
        >
          Skip to content
        </a>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider serverBacked={isCartServerBacked()}>
              <div className="flex min-h-dvh flex-col">
                <SiteHeader />
                <main id="main" className="flex-1">
                  {children}
                </main>
                <SiteFooter />
              </div>
              <CartDrawer />
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
