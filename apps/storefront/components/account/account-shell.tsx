'use client';

import { Heading, Skeleton, Text } from '@tms/ui';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * Presentational frame for the signed-in account sub-pages: a consistent back
 * link, title, optional description and action. When `loading` is set it renders
 * a skeleton instead of its children — callers pass this while the session or
 * page data is still hydrating (auth guarding lives in `useRequireAuth`).
 */
export function AccountShell({
  title,
  description,
  action,
  loading,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/account"
          className="inline-flex items-center gap-1 rounded-sm text-sm text-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Account
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Heading as={1} size="display-lg">
              {title}
            </Heading>
            {description ? (
              <Text tone="secondary" className="mt-1">
                {description}
              </Text>
            ) : null}
          </div>
          {!loading ? action : null}
        </div>
      </div>
      {loading ? <Skeleton className="h-40 w-full max-w-2xl" /> : children}
    </div>
  );
}
