'use client';

import { Alert, Card, Eyebrow, Heading, Skeleton, Text, cn } from '@tms/ui';
import { useEffect, useState } from 'react';
import { adminDataProvider, type AdminAnalytics } from '@/lib/data';
import { barPercent, maxOrders, maxRevenue } from '@/lib/analytics';
import type { StatusTone } from '@/lib/order-status';

type State = { phase: 'loading' } | { phase: 'error' } | { phase: 'ready'; data: AdminAnalytics };

const toneBar: Record<StatusTone, string> = {
  neutral: 'bg-[var(--color-ink-2)]',
  accent: 'bg-accent',
  success: 'bg-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]',
  error: 'bg-[var(--color-error)]',
  info: 'bg-[var(--color-information)]',
};

function money(minor: number): string {
  return `₦${Math.round(minor / 100).toLocaleString('en-NG')}`;
}

function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString(undefined, {
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function AnalyticsView() {
  const [state, setState] = useState<State>({ phase: 'loading' });

  useEffect(() => {
    let active = true;
    adminDataProvider
      .getAnalytics()
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
        <Eyebrow>Insights</Eyebrow>
        <Heading as={1} size="display-lg" className="mt-2">
          Analytics
        </Heading>
        <Text tone="secondary" className="mt-2">
          Sales trend, order mix and top performers over the last 14 days.
        </Text>
      </div>

      <Alert tone="info" title="Preview data">
        Figures are computed from representative sample orders, the admin analytics API isn’t
        connected yet.
      </Alert>

      {state.phase === 'loading' ? <AnalyticsSkeleton /> : null}

      {state.phase === 'error' ? (
        <Alert tone="error" title="Couldn’t load analytics">
          Something went wrong loading the report. Your data is safe, refresh to try again.
        </Alert>
      ) : null}

      {state.phase === 'ready' ? <AnalyticsContent data={state.data} /> : null}
    </div>
  );
}

function AnalyticsContent({ data }: { data: AdminAnalytics }) {
  const oMax = maxOrders(data.daily);
  const rMax = maxRevenue(data.daily);
  const breakdownMax = Math.max(1, ...data.statusBreakdown.map((r) => r.value));

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <section aria-label="Key metrics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.kpis.map((k) => (
            <Card key={k.id} className="border border-line">
              <Text size="sm" tone="muted">
                {k.label}
              </Text>
              <p className="mt-2 font-display text-3xl tabular-nums text-ink">{k.value}</p>
              {k.caption ? <p className="mt-1 text-xs text-muted">{k.caption}</p> : null}
            </Card>
          ))}
        </div>
      </section>

      {/* Daily sales trend */}
      <section aria-labelledby="trend-heading">
        <Heading as={2} id="trend-heading" size="md" className="mb-3">
          Daily orders
        </Heading>
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
          <div className="overflow-x-auto">
            <ul
              className="flex min-w-[36rem] items-end gap-2"
              style={{ height: '12rem' }}
              aria-hidden
            >
              {data.daily.map((p) => (
                <li key={p.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-accent"
                      style={{ height: `${barPercent(p.orders, oMax)}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-muted">{dayLabel(p.date)}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Accessible equivalent of the chart above. */}
          <table className="sr-only">
            <caption>Daily orders and paid revenue over the last 14 days</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Orders</th>
                <th scope="col">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.daily.map((p) => (
                <tr key={p.date}>
                  <th scope="row">{p.date}</th>
                  <td>{p.orders}</td>
                  <td>{money(p.revenueMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-muted">
            Peak day: {oMax} order{oMax === 1 ? '' : 's'} · Peak revenue: {money(rMax)}
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status breakdown */}
        <section aria-labelledby="breakdown-heading">
          <Heading as={2} id="breakdown-heading" size="md" className="mb-3">
            Order status mix
          </Heading>
          <div className="space-y-3 rounded-[var(--radius-lg)] border border-line bg-surface p-5">
            {data.statusBreakdown.map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-ink-2">{row.label}</span>
                  <span className="tabular-nums text-muted">{row.value}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-canvas-2">
                  <div
                    className={cn('h-full rounded-full', toneBar[row.tone ?? 'neutral'])}
                    style={{ width: `${barPercent(row.value, breakdownMax)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Top performers */}
        <section aria-label="Top performers" className="space-y-6">
          {[data.topArtwork, data.topGarments].map((list) => (
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

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8" aria-hidden>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    </div>
  );
}
