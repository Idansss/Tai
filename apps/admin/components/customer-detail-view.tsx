'use client';

import { Alert, Badge, Heading, Skeleton, Text } from '@tms/ui';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminDataProvider, type AdminCustomerProfile, type CustomerStatus } from '@/lib/data';
import { formatOrderStatus, orderStatusTone, type StatusTone } from '@/lib/order-status';

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

function money(minor: number): string {
  return `₦${Math.round(minor / 100).toLocaleString('en-NG')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function Panel({ title, children, id }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-[var(--radius-lg)] border border-line bg-surface p-5"
    >
      <Heading as={2} id={id} size="md" className="mb-4">
        {title}
      </Heading>
      {children}
    </section>
  );
}

export function CustomerDetailView({ id }: { id: string }) {
  const [customer, setCustomer] = useState<AdminCustomerProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    adminDataProvider.getCustomer(id).then((c) => {
      if (!active) return;
      setCustomer(c);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [id]);

  if (!loaded) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 rounded-sm text-sm text-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Customers
        </Link>
        <Alert tone="warning" title="Customer not found">
          No customer matches <span className="font-medium">{id}</span>.
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 rounded-sm text-sm text-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Customers
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Heading as={1} size="display-lg">
            {customer.name}
          </Heading>
          <Badge tone={STATUS_TONE[customer.status]}>{STATUS_LABEL[customer.status]}</Badge>
        </div>
        <Text tone="secondary" className="mt-1">
          {customer.email}
        </Text>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start">
        {/* Order history */}
        <Panel title="Order history" id="orders-heading">
          {customer.orders.length === 0 ? (
            <Text tone="muted">No orders yet.</Text>
          ) : (
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="border-b border-line bg-canvas-2 text-left text-xs uppercase tracking-[0.06em] text-muted">
                    <th scope="col" className="px-3 py-2 font-medium">
                      Reference
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Placed
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-2 text-center font-medium">
                      Items
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((o) => (
                    <tr key={o.reference} className="border-b border-line last:border-b-0">
                      <td className="px-3 py-2">
                        <Link
                          href={`/orders/${o.reference}`}
                          className="rounded-sm font-medium text-ink underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                        >
                          {o.reference}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-ink-2">{formatDate(o.placedAt)}</td>
                      <td className="px-3 py-2">
                        <Badge tone={orderStatusTone(o.status)}>
                          {formatOrderStatus(o.status)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-ink-2">
                        {o.itemCount}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink">
                        {money(o.totalMinor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Sidebar */}
        <div className="space-y-6">
          <Panel title="Contact" id="contact-heading">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted">Email</dt>
                <dd className="text-ink">{customer.email}</dd>
              </div>
              <div>
                <dt className="text-muted">Phone</dt>
                <dd className="text-ink">{customer.phone}</dd>
              </div>
              <div>
                <dt className="text-muted">Location</dt>
                <dd className="text-ink-2">
                  {customer.city}, {customer.state}
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Summary" id="summary-heading">
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Orders</dt>
                <dd className="tabular-nums text-ink-2">{customer.orderCount}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Total spent</dt>
                <dd className="tabular-nums text-ink">{money(customer.totalSpentMinor)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Saved designs</dt>
                <dd className="tabular-nums text-ink-2">{customer.savedDesigns}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Last order</dt>
                <dd className="text-ink-2">{formatDate(customer.lastOrderAt)}</dd>
              </div>
            </dl>
            <Text size="sm" tone="muted" className="mt-4">
              Saved designs are representative until the account API lands (TMS-FBR-005).
            </Text>
          </Panel>
        </div>
      </div>
    </div>
  );
}
