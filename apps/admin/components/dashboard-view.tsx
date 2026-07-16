'use client';

import { Alert, Badge, Card, Eyebrow, Heading, Skeleton, Text, cn } from '@tms/ui';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminDataProvider, type DashboardData, type DashboardMetric } from '@/lib/data';
import { formatOrderStatus, orderStatusTone } from '@/lib/order-status';

type State = { phase: 'loading' } | { phase: 'error' } | { phase: 'ready'; data: DashboardData };

const metricToneRing: Record<NonNullable<DashboardMetric['tone']>, string> = {
  default: 'border-line',
  warning: 'border-[color:var(--color-warning)]',
  danger: 'border-[color:var(--color-error)]',
};

function TrendChip({ trend }: { trend: NonNullable<DashboardMetric['trend']> }) {
  const Icon =
    trend.direction === 'up' ? ArrowUpRight : trend.direction === 'down' ? ArrowDownRight : Minus;
  const tone =
    trend.direction === 'up'
      ? 'text-success'
      : trend.direction === 'down'
        ? 'text-error'
        : 'text-muted';
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', tone)}>
      <Icon className="size-3.5" aria-hidden />
      {trend.label}
    </span>
  );
}

export function DashboardView() {
  const [state, setState] = useState<State>({ phase: 'loading' });

  useEffect(() => {
    let active = true;
    adminDataProvider
      .getDashboard()
      .then((data) => {
        if (active) setState({ phase: 'ready', data });
      })
      .catch(() => {
        if (active) setState({ phase: 'error' });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <Eyebrow>Overview</Eyebrow>
        <Heading as={1} size="display-lg" className="mt-2">
          Dashboard
        </Heading>
        <Text tone="secondary" className="mt-2">
          Operational summary across payments, production and fulfilment.
        </Text>
      </div>

      <Alert tone="info" title="Preview data">
        Figures below are representative sample data, the admin read endpoints aren’t connected
        yet, so nothing here reflects real orders.
      </Alert>

      {state.phase === 'loading' ? <DashboardSkeleton /> : null}

      {state.phase === 'error' ? (
        <Alert tone="error" title="Couldn’t load the dashboard">
          Something went wrong loading the operational summary. Your data is safe, refresh to try
          again.
        </Alert>
      ) : null}

      {state.phase === 'ready' ? <DashboardContent data={state.data} /> : null}
    </div>
  );
}

function DashboardContent({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-8">
      {/* Metrics */}
      <section aria-label="Key metrics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.metrics.map((m) => (
            <Card key={m.id} className={cn('border', metricToneRing[m.tone ?? 'default'])}>
              <div className="flex items-start justify-between gap-2">
                <Text size="sm" tone="muted">
                  {m.label}
                </Text>
                {m.trend ? <TrendChip trend={m.trend} /> : null}
              </div>
              <p className="mt-2 font-display text-3xl tabular-nums text-ink">{m.value}</p>
              {m.caption ? <p className="mt-1 text-xs text-muted">{m.caption}</p> : null}
            </Card>
          ))}
        </div>
      </section>

      {/* Operational queues */}
      <section aria-labelledby="queues-heading">
        <Heading as={2} id="queues-heading" size="md" className="mb-3">
          Operational queues
        </Heading>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {data.queues.map((q) => (
            <Link
              key={q.id}
              href={q.href}
              className="group rounded-[var(--radius-lg)] border border-line bg-surface p-4 outline-none transition-colors hover:border-line-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              <span className="flex items-center justify-between">
                <span
                  className={cn(
                    'font-display text-2xl tabular-nums',
                    q.tone === 'danger' ? 'text-error' : 'text-ink',
                  )}
                >
                  {q.count}
                </span>
                <ArrowRight
                  className="size-4 text-muted transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
              <span className="mt-1 block text-xs text-muted">{q.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Recent orders */}
        <section aria-labelledby="recent-heading">
          <div className="mb-3 flex items-center justify-between">
            <Heading as={2} id="recent-heading" size="md">
              Recent orders
            </Heading>
            <Link
              href="/orders"
              className="rounded-sm text-xs font-medium text-ink-2 underline-offset-2 outline-none hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              View all
            </Link>
          </div>
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-left text-xs uppercase tracking-[0.06em] text-muted">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Reference
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Customer
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((o) => (
                  <tr key={o.reference} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/${o.reference}`}
                        className="rounded-sm font-medium text-ink underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                      >
                        {o.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-2">{o.customerName}</td>
                    <td className="px-4 py-3">
                      <Badge tone={orderStatusTone(o.status)}>{formatOrderStatus(o.status)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink">
                      ₦{Math.round(o.totalMinor / 100).toLocaleString('en-NG')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Ranked lists */}
        <section aria-label="Top performers" className="space-y-6">
          {data.rankedLists.map((list) => (
            <div key={list.id}>
              <Heading as={2} size="md" className="mb-3">
                {list.title}
              </Heading>
              <ol className="divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-surface">
                {list.items.map((item, i) => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="w-4 shrink-0 text-xs tabular-nums text-muted">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{item.label}</span>
                    <span className="shrink-0 text-xs text-muted">{item.value}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-hidden>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
