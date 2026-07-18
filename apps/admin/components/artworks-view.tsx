'use client';

import { Alert, Badge, Skeleton, Text, cn } from '@tms/ui';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/admin-page-header';
import { adminDataProvider, type AdminArtworkSummary, type ArtworkStatus } from '@/lib/data';
import { artworkStatusTone, filterArtworks, formatArtworkStatus } from '@/lib/artworks';

const STATUS_OPTIONS: ArtworkStatus[] = [
  'draft',
  'processing',
  'needs_review',
  'ready',
  'scheduled',
  'published',
  'archived',
];

const controlClass =
  'h-10 rounded-md border border-line-2 bg-canvas px-3 text-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ArtworksView() {
  const [all, setAll] = useState<AdminArtworkSummary[] | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ArtworkStatus | 'all'>('all');

  useEffect(() => {
    let active = true;
    adminDataProvider.listArtworks().then((list) => {
      if (active) setAll(list);
    });
    return () => {
      active = false;
    };
  }, []);

  const rows = all ? filterArtworks(all, { query, status }) : [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Artworks"
        lead="Manage artwork, versions, mockups and publishing."
        action={
          <Link
            href="/artworks/new"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-xs font-semibold uppercase tracking-[0.08em] text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            <Plus className="size-4" aria-hidden />
            New artwork
          </Link>
        }
      />

      <Alert tone="info" title="Preview data">
        Artworks below are representative sample data — the admin catalogue API isn’t connected yet.
      </Alert>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <label htmlFor="artwork-search" className="sr-only">
            Search artworks
          </label>
          <input
            id="artwork-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or collection"
            className={cn(controlClass, 'w-full pl-9')}
          />
        </div>
        <div>
          <label htmlFor="artwork-status" className="sr-only">
            Filter by status
          </label>
          <select
            id="artwork-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ArtworkStatus | 'all')}
            className={controlClass}
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {formatArtworkStatus(s)}
              </option>
            ))}
          </select>
        </div>
        {all ? (
          <span className="text-sm text-muted" aria-live="polite">
            {rows.length} artwork{rows.length === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      {/* List */}
      {!all ? (
        <Skeleton className="h-80 w-full" />
      ) : rows.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line p-10 text-center">
          <Text tone="muted">No artworks match your search.</Text>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-line bg-surface text-left text-xs uppercase tracking-[0.06em] text-muted">
                <th scope="col" className="px-4 py-3 font-medium">
                  Title
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Collection
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  Versions
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  Mockups
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-line last:border-b-0 hover:bg-canvas-2">
                  <td className="px-4 py-3">
                    <Link
                      href={`/artworks/${a.id}`}
                      className="rounded-sm font-medium text-ink underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                    >
                      {a.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-2">{a.collection}</td>
                  <td className="px-4 py-3">
                    <Badge tone={artworkStatusTone(a.status)}>
                      {formatArtworkStatus(a.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-ink-2">
                    {a.versionCount}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-ink-2">{a.mockupCount}</td>
                  <td className="px-4 py-3 text-ink-2">{formatDate(a.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
