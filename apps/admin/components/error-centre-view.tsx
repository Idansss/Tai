'use client';

import { Alert, Badge, Eyebrow, Heading, Skeleton, Text, cn } from '@tms/ui';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  adminDataProvider,
  type AdminErrorEntry,
  type ErrorResolution,
  type ErrorSource,
} from '@/lib/data';
import {
  applyErrorAction,
  type ErrorAction,
  errorActions,
  filterErrors,
  formatErrorSource,
  formatResolution,
  formatSeverity,
  openCount,
  resolutionTone,
  severityTone,
} from '@/lib/errors';

const SOURCES: ErrorSource[] = [
  'payment',
  'webhook',
  'shipping',
  'image_processing',
  'email',
  'ai',
  'background_job',
];
const RESOLUTIONS: ErrorResolution[] = ['open', 'investigating', 'retrying', 'resolved', 'ignored'];

const controlClass =
  'h-10 rounded-md border border-line-2 bg-canvas px-3 text-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ErrorCentreView() {
  const [errors, setErrors] = useState<AdminErrorEntry[] | null>(null);
  const [source, setSource] = useState<ErrorSource | 'all'>('all');
  const [resolution, setResolution] = useState<ErrorResolution | 'all'>('all');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    adminDataProvider.listErrors().then((list) => {
      if (active) setErrors(list);
    });
    return () => {
      active = false;
    };
  }, []);

  const open = useMemo(() => (errors ? openCount(errors) : 0), [errors]);
  const rows = errors ? filterErrors(errors, { source, resolution, query }) : [];

  function runAction(entry: AdminErrorEntry, action: ErrorAction, label: string) {
    const next = applyErrorAction(entry, action);
    if (next === entry.resolution) return;
    setErrors((current) =>
      (current ?? []).map((e) => (e.id === entry.id ? { ...e, resolution: next } : e)),
    );
    setNotice(
      `Preview build — “${label}” would call the operations API. ${entry.correlationId} set to “${formatResolution(next)}” locally (not saved).`,
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Operations</Eyebrow>
        <Heading as={1} size="display-lg" className="mt-2">
          Error centre
        </Heading>
        <Text tone="secondary" className="mt-2">
          Integration failures across payments, webhooks, shipping, media, email, AI and jobs — with
          a correlation ID and resolution state. No stack traces or secrets are shown.
        </Text>
      </div>

      <Alert tone="info" title="Preview data">
        Entries are representative sample failures — the operations API isn’t connected, so
        resolution changes update the list locally and aren’t saved.
      </Alert>

      {errors ? (
        <Alert tone={open > 0 ? 'warning' : 'success'} title={`${open} unresolved`}>
          {open > 0
            ? 'These failures still need attention (open, investigating or retrying).'
            : 'Every logged failure has been resolved or ignored.'}
        </Alert>
      ) : null}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <label htmlFor="error-search" className="sr-only">
            Search errors
          </label>
          <input
            id="error-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Correlation ID, order or message"
            className={cn(controlClass, 'w-full pl-9')}
          />
        </div>
        <div>
          <label htmlFor="error-source" className="sr-only">
            Filter by source
          </label>
          <select
            id="error-source"
            value={source}
            onChange={(e) => setSource(e.target.value as ErrorSource | 'all')}
            className={controlClass}
          >
            <option value="all">All sources</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {formatErrorSource(s)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="error-resolution" className="sr-only">
            Filter by resolution
          </label>
          <select
            id="error-resolution"
            value={resolution}
            onChange={(e) => setResolution(e.target.value as ErrorResolution | 'all')}
            className={controlClass}
          >
            <option value="all">All states</option>
            {RESOLUTIONS.map((r) => (
              <option key={r} value={r}>
                {formatResolution(r)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div aria-live="polite" className="empty:hidden">
        {notice ? (
          <Alert tone="info" title="Preview">
            {notice}
          </Alert>
        ) : null}
      </div>

      {/* List */}
      {!errors ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line p-10 text-center">
          <Text tone="muted">No failures match your filters.</Text>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={severityTone(entry.severity)}>
                      {formatSeverity(entry.severity)}
                    </Badge>
                    <span className="text-sm font-medium text-ink">
                      {formatErrorSource(entry.source)}
                    </span>
                    <Badge tone={resolutionTone(entry.resolution)}>
                      {formatResolution(entry.resolution)}
                    </Badge>
                  </div>
                  <Text className="mt-2 text-ink-2">{entry.message}</Text>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                    <span className="font-mono">{entry.correlationId}</span>
                    <span>{formatDateTime(entry.occurredAt)}</span>
                    {entry.affectedOrder ? (
                      <Link
                        href={`/orders/${entry.affectedOrder}`}
                        className="rounded-sm text-ink-2 underline-offset-2 outline-none hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                      >
                        Order {entry.affectedOrder}
                      </Link>
                    ) : null}
                    {!entry.retryable ? <span>Not retryable</span> : null}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                {errorActions(entry).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => runAction(entry, a.id, a.label)}
                    className={cn(
                      'inline-flex h-9 items-center rounded-md px-3 text-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                      a.intent === 'primary'
                        ? 'bg-accent text-on-accent hover:brightness-110'
                        : 'border border-line-2 text-ink hover:bg-canvas-2',
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
