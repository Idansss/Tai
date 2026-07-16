'use client';

import { Alert, Badge, Eyebrow, Heading, Select, Skeleton, Text, cn } from '@tms/ui';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminDataProvider, type AdminCustomerSummary, type CustomerStatus } from '@/lib/data';
import { filterCustomers } from '@/lib/customers';
import type { StatusTone } from '@/lib/order-status';

const STATUS_OPTIONS: CustomerStatus[] = ['new', 'active', 'dormant'];

const STATUS_LABEL: Record<CustomerStatus, string> = {
  new: 'New',
  active: 'Active',
  dormant: 'Dormant',
};

const STATUS_TONE: Record<CustomerStatus, StatusTone> = {
  new: 'info',
  active: 'success',
  dormant: 'neutral',
};

const controlClass =
  'h-10 rounded-md border border-line-2 bg-canvas px-3 text-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]';

function money(minor: number): string {
  return `₦${Math.round(minor / 100).toLocaleString('en-NG')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function CustomersView() {
  const [all, setAll] = useState<AdminCustomerSummary[] | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<CustomerStatus | 'all'>('all');

  useEffect(() => {
    let active = true;
    adminDataProvider.listCustomers().then((list) => {
      if (active) setAll(list);
    });
    return () => {
      active = false;
    };
  }, []);

  const rows = all ? filterCustomers(all, { query, status }) : [];

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>People</Eyebrow>
        <Heading as={1} size="display-lg" className="mt-2">
          Customers
        </Heading>
        <Text tone="secondary" className="mt-2">
          The customer directory, reconciled from order history by contact email.
        </Text>
      </div>

      <Alert tone="info" title="Preview data">
        Customers are derived from representative sample orders, the admin customer API isn’t
        connected yet.
      </Alert>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <label htmlFor="customer-search" className="sr-only">
            Search customers
          </label>
          <input
            id="customer-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            className={cn(controlClass, 'w-full pl-9')}
          />
        </div>
        <div>
          <label htmlFor="customer-status" className="sr-only">
            Filter by status
          </label>
          <Select
            id="customer-status"
            value={status}
            onChange={(next) => setStatus(next as CustomerStatus | 'all')}
            options={[
              { value: 'all', label: 'All customers' },
              ...STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
            ]}
          />
        </div>
        {all ? (
          <span className="text-sm text-muted" aria-live="polite">
            {rows.length} customer{rows.length === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      {/* List */}
      {!all ? (
        <Skeleton className="h-80 w-full" />
      ) : rows.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line p-10 text-center">
          <Text tone="muted">No customers match your search.</Text>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-line bg-surface text-left text-xs uppercase tracking-[0.06em] text-muted">
                <th scope="col" className="px-4 py-3 font-medium">
                  Customer
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  Orders
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Total spent
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Last order
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-b-0 hover:bg-canvas-2">
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/${encodeURIComponent(c.id)}`}
                      className="rounded-sm font-medium text-ink underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                    >
                      {c.name}
                    </Link>
                    <span className="block text-xs text-muted">{c.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-ink-2">{c.orderCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink">
                    {money(c.totalSpentMinor)}
                  </td>
                  <td className="px-4 py-3 text-ink-2">{formatDate(c.lastOrderAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
