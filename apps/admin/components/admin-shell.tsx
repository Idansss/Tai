'use client';

import { cn, IconButton } from '@tms/ui';
import {
  BarChart3,
  Boxes,
  Factory,
  Home,
  LayoutDashboard,
  Megaphone,
  Menu,
  Palette,
  ScrollText,
  ShoppingBag,
  Sparkles,
  TriangleAlert,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type MouseEvent, useCallback, useEffect, useRef } from 'react';
import { useAdminAuth } from './admin-auth-provider';

const NAV_GROUPS = [
  {
    label: 'Operations',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/orders', label: 'Orders', icon: ShoppingBag },
      { href: '/artworks', label: 'Artworks', icon: Palette },
      { href: '/storyteller', label: 'Brand Storyteller', icon: Sparkles },
      { href: '/garments', label: 'Garments', icon: Boxes },
      { href: '/production', label: 'Production', icon: Factory },
      { href: '/customers', label: 'Customers', icon: Users },
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/errors', label: 'Error centre', icon: TriangleAlert },
    ],
  },
  {
    label: 'Website content',
    items: [
      { href: '/content/homepage', label: 'Homepage', icon: Home },
      { href: '/content/announcements', label: 'Announcements', icon: Megaphone },
      { href: '/content/audit', label: 'Audit log', icon: ScrollText },
    ],
  },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
}

function roleLabel(role: string): string {
  switch (role) {
    case 'OWNER':
      return 'Owner';
    case 'ADMINISTRATOR':
      return 'Administrator';
    case 'RESTRICTED_STAFF':
      return 'Staff';
    default:
      return 'Console';
  }
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="space-y-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted">
            {group.label}
          </p>
          <ul className="space-y-1">
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                      active
                        ? 'bg-canvas-2 font-medium text-ink'
                        : 'text-ink-2 hover:bg-canvas-2 hover:text-ink',
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, logout } = useAdminAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isLogin = pathname === '/login';

  const close = useCallback(() => dialogRef.current?.close(), []);
  const open = useCallback(() => {
    dialogRef.current?.showModal();
    document.body.style.overflow = 'hidden';
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      document.body.style.overflow = '';
    };
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, []);

  // Close the mobile nav on route change.
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Guard: send unauthenticated staff to sign in (except on the login page).
  useEffect(() => {
    if (ready && !user && !isLogin) router.replace('/login');
  }, [ready, user, isLogin, router]);

  const onDialogClick = useCallback(
    (event: MouseEvent<HTMLDialogElement>) => {
      if (event.target === dialogRef.current) close();
    },
    [close],
  );

  // The login page renders on its own, without the console chrome.
  if (isLogin) {
    return <div className="grid min-h-dvh place-items-center p-5">{children}</div>;
  }

  // Until the session hydrates (or while redirecting a guest), show a minimal
  // loading state rather than flashing the console.
  if (!ready || !user) {
    return (
      <div className="grid min-h-dvh place-items-center p-5" role="status" aria-live="polite">
        <span className="text-sm text-muted">Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar — pinned while the main content scrolls */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 self-start overflow-y-auto border-r border-line bg-surface md:block">
        <div className="flex h-16 items-center border-b border-line px-5">
          <span className="font-display text-sm font-semibold tracking-tight">TMS Admin</span>
        </div>
        <nav className="p-3" aria-label="Admin sections">
          <NavList pathname={pathname} />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface px-4 sm:px-5">
          <div className="flex items-center gap-2">
            <IconButton
              className="md:hidden"
              label="Open menu"
              icon={<Menu className="size-5" aria-hidden />}
              onClick={open}
              aria-haspopup="dialog"
            />
            <span className="font-display text-sm font-medium md:hidden">TMS Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs uppercase tracking-[0.08em] text-muted sm:inline">
              {roleLabel(user.role)}
            </span>
            <span className="hidden text-sm text-ink-2 sm:inline" aria-hidden>
              ·
            </span>
            <span className="max-w-[10rem] truncate text-sm text-ink" title={user.email}>
              {user.name}
            </span>
            <button
              type="button"
              onClick={() => {
                void logout().then(() => router.replace('/login'));
              }}
              className="inline-flex h-9 items-center justify-center rounded-md border border-line-2 px-3 text-xs font-medium text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              Sign out
            </button>
          </div>
        </header>
        <main id="main" className="flex-1 p-5 sm:p-8">
          {children}
        </main>
      </div>

      {/* Mobile nav dialog */}
      <dialog
        ref={dialogRef}
        aria-label="Admin menu"
        onClick={onDialogClick}
        className="m-0 h-dvh max-h-none w-[min(20rem,85vw)] max-w-none bg-surface p-0 text-ink backdrop:bg-black/50 open:flex open:flex-col"
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <span className="font-display text-sm font-semibold tracking-tight">TMS Admin</span>
          <IconButton
            label="Close menu"
            icon={<X className="size-5" aria-hidden />}
            onClick={close}
          />
        </div>
        <nav className="p-3" aria-label="Admin sections">
          <NavList pathname={pathname} onNavigate={close} />
        </nav>
      </dialog>
    </div>
  );
}
