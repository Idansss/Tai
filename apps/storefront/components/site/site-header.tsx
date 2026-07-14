'use client';

import { Container, IconButton, cn } from '@tms/ui';
import { Menu, Search, ShoppingBag, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type MouseEvent, useCallback, useEffect, useRef } from 'react';
import { primaryNav } from '@/lib/nav';

/**
 * Site header with an accessible mobile menu built on the native <dialog>
 * element (showModal gives focus trapping, Esc-to-close, and an inert
 * background for free). Body scroll is locked while the menu is open.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);

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
            className="rounded-sm font-display text-lg font-semibold tracking-tight text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            Tai Manic Studios
          </Link>

          <ul className="hidden items-center gap-8 md:flex">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={cn(
                    'rounded-sm text-xs font-medium uppercase tracking-[0.08em] outline-none transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                    isActive(item.href) ? 'text-ink' : 'text-muted',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1">
            <IconButton label="Search" icon={<Search className="size-5" aria-hidden />} />
            <IconButton label="Cart" icon={<ShoppingBag className="size-5" aria-hidden />} />
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
        className="m-0 ml-auto h-dvh max-h-none w-[min(22rem,85vw)] max-w-none bg-canvas p-0 text-ink backdrop:bg-black/40 open:flex open:flex-col"
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <span className="font-display text-sm font-semibold tracking-tight">Menu</span>
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
                  'block rounded-md px-3 py-3 text-base outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                  isActive(item.href) ? 'text-ink' : 'text-ink-2',
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
