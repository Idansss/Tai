'use client';

import { Badge, IconButton, Select, cn } from '@tms/ui';
import { SlidersHorizontal, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useMemo, useRef } from 'react';
import type { ArtworkFilters as Filters } from '@/lib/gallery-params';
import { buildArtworkQuery, hasActiveFilters } from '@/lib/gallery-params';

const availabilityOptions = [
  { value: '', label: 'Any availability' },
  { value: 'available', label: 'Available' },
  { value: 'limited', label: 'Limited edition' },
  { value: 'sold_out', label: 'Sold out' },
];

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most popular' },
];

const availabilityLabel: Record<string, string> = {
  available: 'Available',
  limited: 'Limited edition',
  sold_out: 'Sold out',
};

export function ArtworkFilters({
  collections,
  filters,
}: {
  collections: string[];
  filters: Filters;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const navigate = useCallback(
    (next: Filters) => {
      router.push(`/artworks${buildArtworkQuery(next)}`, { scroll: false });
    },
    [router],
  );

  const set = useCallback(
    (patch: Partial<Filters>) => navigate({ ...filters, ...patch }),
    [filters, navigate],
  );

  const clear = useCallback(() => navigate({ sort: 'newest' }), [navigate]);

  const collectionOptions = useMemo(
    () => [
      { value: '', label: 'All collections' },
      ...collections.map((c) => ({ value: c, label: c })),
    ],
    [collections],
  );

  const controls = (idPrefix: string): ReactNode => (
    <>
      <div>
        <label htmlFor={`${idPrefix}-collection`} className="text-xs font-medium text-ink-2">
          Collection
        </label>
        <Select
          id={`${idPrefix}-collection`}
          className="mt-1"
          value={filters.collection ?? ''}
          onChange={(next) => set({ collection: next || undefined })}
          options={collectionOptions}
          placeholder="All collections"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-availability`} className="text-xs font-medium text-ink-2">
          Availability
        </label>
        <Select
          id={`${idPrefix}-availability`}
          className="mt-1"
          value={filters.availability ?? ''}
          onChange={(next) =>
            set({ availability: (next || undefined) as Filters['availability'] })
          }
          options={availabilityOptions}
          placeholder="Any availability"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-sort`} className="text-xs font-medium text-ink-2">
          Sort
        </label>
        <Select
          id={`${idPrefix}-sort`}
          className="mt-1"
          value={filters.sort}
          onChange={(next) => set({ sort: next as Filters['sort'] })}
          options={sortOptions}
        />
      </div>
    </>
  );

  const active = hasActiveFilters(filters);

  return (
    <div className="space-y-4">
      {/* Desktop filter bar */}
      <div className="hidden items-end gap-4 md:flex">
        <div className="grid flex-1 grid-cols-3 gap-4">{controls('desktop')}</div>
        {active ? (
          <button
            type="button"
            onClick={clear}
            className="h-10 shrink-0 rounded-md px-3 text-sm text-muted underline-offset-2 outline-none hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {/* Mobile trigger */}
      <div className="flex items-center justify-between md:hidden">
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          aria-haspopup="dialog"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-line-2 bg-surface px-3 text-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          <SlidersHorizontal className="size-4" aria-hidden /> Filters
        </button>
        {active ? (
          <button
            type="button"
            onClick={clear}
            className="text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* Active filter chips */}
      {active ? (
        <ul className="flex flex-wrap gap-2" aria-label="Active filters">
          {filters.collection ? (
            <li>
              <FilterChip
                label={filters.collection}
                onRemove={() => set({ collection: undefined })}
              />
            </li>
          ) : null}
          {filters.availability ? (
            <li>
              <FilterChip
                label={availabilityLabel[filters.availability] ?? filters.availability}
                onRemove={() => set({ availability: undefined })}
              />
            </li>
          ) : null}
          {filters.sort !== 'newest' ? (
            <li>
              <FilterChip label="Most popular" onRemove={() => set({ sort: 'newest' })} />
            </li>
          ) : null}
        </ul>
      ) : null}

      {/* Mobile drawer */}
      <dialog
        ref={dialogRef}
        aria-label="Filter artworks"
        className="m-0 ml-auto h-dvh max-h-none w-[min(22rem,90vw)] max-w-none bg-canvas p-0 text-ink backdrop:bg-black/40 open:flex open:flex-col"
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <span className="font-display text-sm font-semibold tracking-tight">Filters</span>
          <IconButton
            label="Close filters"
            icon={<X className="size-5" aria-hidden />}
            onClick={() => dialogRef.current?.close()}
          />
        </div>
        <div className="flex flex-col gap-4 p-5">{controls('mobile')}</div>
        <div className="mt-auto border-t border-line p-5">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="h-11 w-full rounded-md bg-accent text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            Show results
          </button>
        </div>
      </dialog>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge tone="neutral" className="pr-1">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="ml-1 grid size-4 place-items-center rounded-full outline-none hover:bg-line focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-focus-ring)]"
      >
        <X className="size-3" aria-hidden />
      </button>
    </Badge>
  );
}
