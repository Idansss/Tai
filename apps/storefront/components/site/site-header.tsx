'use client';

import { Container, IconButton, cn } from '@tms/ui';
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type MouseEvent, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/components/account/auth-provider';
import { useCart } from '@/components/cart/cart-provider';
import { BrandLogo } from '@/components/site/brand-logo';
import { primaryNav } from '@/lib/nav';

/**
 * Site header with an accessible mobile menu built on the native <dialog>
 * element (showModal gives focus trapping, Esc-to-close, and an inert
 * background for free). Body scroll is locked while the menu is open.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { count, ready, openCart } = useCart();
  const { user, ready: authReady } = useAuth();

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  const open = useCallback(() => {
    dialogRef.current?.showModal();
    document.body.style.overflow = 'hidden';
  }, []);

  // Restore body scroll whenever the dialog closes (Esc, link, backdrop, button).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      document.body.style.overflow = '';
    };
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, []);

  // Close the menu whenever the route changes.
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Close when the backdrop (the dialog element itself, outside the panel) is clicked.
  const onDialogClick = useCallback(
    (event: MouseEvent<HTMLDialogElement>) => {
      if (event.target === dialogRef.current) close();
    },
    [close],
  );

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
      <Container>
        <nav className="flex h-16 items-center justify-between gap-4" aria-label="Primary">
          <Link
            href="/"
            aria-label="F.A.T.U home"
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            <BrandLogo className="size-11" priority sizes="44px" />
          </Link>

          <ul className="hidden items-center gap-8 md:flex">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={cn(
                    'relative rounded-sm text-xs font-medium uppercase tracking-[0.08em] outline-none transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                    'after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:bg-accent after:transition-[width] after:duration-200 after:content-[""]',
                    isActive(item.href)
                      ? 'text-ink after:w-full'
                      : 'text-muted after:w-0 hover:after:w-full',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1">
            <Link
              href="/search"
              aria-label="Search"
              className="inline-flex size-11 items-center justify-center rounded-[var(--radius-md)] text-ink outline-none transition-colors hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              <Search className="size-5" aria-hidden />
            </Link>
            <Link
              href={authReady && user ? '/account' : '/login'}
              aria-label={authReady && user ? `Account — ${user.name}` : 'Sign in'}
              className="inline-flex size-11 items-center justify-center rounded-[var(--radius-md)] text-ink outline-none transition-colors hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              <User className="size-5" aria-hidden />
            </Link>
            <div className="relative">
              <IconButton
                label={ready && count > 0 ? `Bag, ${count} item${count === 1 ? '' : 's'}` : 'Bag'}
                icon={<ShoppingBag className="size-5" aria-hidden />}
                onClick={openCart}
                aria-haspopup="dialog"
              />
              {ready && count > 0 ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-1 top-1 grid min-w-[1.1rem] place-items-center rounded-full bg-accent px-1 text-[0.65rem] font-semibold leading-tight text-on-accent"
                >
                  {count > 9 ? '9+' : count}
                </span>
              ) : null}
            </div>
            <IconButton
              className="md:hidden"
              label="Open menu"
              icon={<Menu className="size-5" aria-hidden />}
              onClick={open}
              aria-haspopup="dialog"
            />
          </div>
        </nav>
      </Container>

      <dialog
        ref={dialogRef}
        aria-label="Site menu"
        onClick={onDialogClick}
        className="tms-slideover m-0 ml-auto h-dvh max-h-none w-[min(22rem,85vw)] max-w-none bg-canvas p-0 text-ink open:flex open:flex-col"
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <div className="flex items-center gap-2.5">
            <BrandLogo className="size-9" sizes="36px" />
            <span className="font-display text-sm font-semibold tracking-tight">Menu</span>
          </div>
          <IconButton
            label="Close menu"
            icon={<X className="size-5" aria-hidden />}
            onClick={close}
          />
        </div>
        <ul className="flex flex-col gap-1 p-3">
          {primaryNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={close}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  'block rounded-md border-l-2 px-3 py-3 text-base outline-none transition-colors hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                  isActive(item.href)
                    ? 'border-accent bg-canvas-2 font-medium text-ink'
                    : 'border-transparent text-ink-2',
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </dialog>
    </header>
  );
}
