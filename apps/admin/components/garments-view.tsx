'use client';

import { Alert, Badge, Skeleton, Text, cn } from '@tms/ui';
import { AdminPageHeader } from '@/components/admin-page-header';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminDataProvider, type AdminGarmentSummary, type GarmentStatus } from '@/lib/data';
import {
  filterGarments,
  formatGarmentStatus,
  formatNaira,
  garmentStatusTone,
} from '@/lib/garments';

const STATUS_OPTIONS: GarmentStatus[] = ['active', 'draft', 'archived'];

const controlClass =
  'h-10 rounded-md border border-line-2 bg-canvas px-3 text-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function GarmentsView() {
  const [all, setAll] = useState<AdminGarmentSummary[] | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<GarmentStatus | 'all'>('all');

  useEffect(() => {
    let active = true;
    adminDataProvider.listGarments().then((list) => {
      if (active) setAll(list);
    });
    return () => {
      active = false;
    };
  }, []);

  const rows = all ? filterGarments(all, { query, status }) : [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Garments"
        lead="Manage garment templates, colours, sizes, media, print rules and inventory."
      />

      <Alert tone="info" title="Preview data">
        Garments below are representative sample data — the admin catalogue API isn’t connected yet.
      </Alert>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <label htmlFor="garment-search" className="sr-only">
            Search garments
          </label>
          <input
            id="garment-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or template"
            className={cn(controlClass, 'w-full pl-9')}
          />
        </div>
        <div>
          <label htmlFor="garment-status" className="sr-only">
            Filter by status
          </label>
          <select
            id="garment-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as GarmentStatus | 'all')}
            className={controlClass}
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {formatGarmentStatus(s)}
              </option>
            ))}
          </select>
        </div>
        {all ? (
          <span className="text-sm text-muted" aria-live="polite">
            {rows.length} garment{rows.length === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      {/* List */}
      {!all ? (
        <Skeleton className="h-80 w-full" />
      ) : rows.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line p-10 text-center">
          <Text tone="muted">No garments match your search.</Text>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line">
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b border-line bg-surface text-left text-xs uppercase tracking-[0.06em] text-muted">
                <th scope="col" className="px-4 py-3 font-medium">
                  Garment
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Template
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  Colours
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  Sizes
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Price
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Stock
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.id} className="border-b border-line last:border-b-0 hover:bg-canvas-2">
                  <td className="px-4 py-3">
                    <Link
                      href={`/garments/${g.id}`}
                      className="rounded-sm font-medium text-ink underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                    >
                      {g.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-2">{g.template}</td>
                  <td className="px-4 py-3">
                    <Badge tone={garmentStatusTone(g.status)}>
                      {formatGarmentStatus(g.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-ink-2">{g.colourCount}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-ink-2">{g.sizeCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-2">
                    {formatNaira(g.priceMinor)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="tabular-nums text-ink-2">{g.totalStock}</span>
                    {g.lowStockCount > 0 ? (
                      <span className="ml-2 inline-block align-middle">
                        <Badge tone="warning">{g.lowStockCount} low</Badge>
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-ink-2">{formatDate(g.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
