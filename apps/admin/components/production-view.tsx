'use client';

import { Alert, Badge, Eyebrow, Heading, Skeleton, Text, cn } from '@tms/ui';
import { AlertTriangle, ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { adminDataProvider, type AdminProductionJob, type ProductionStage } from '@/lib/data';
import { formatShippingStatus } from '@/lib/order-status';
import {
  PRODUCTION_LANES,
  applyStageAction,
  filterJobs,
  formatAge,
  formatPrintStatus,
  groupByStage,
  isPriority,
  printStatusForOrderStatus,
  productionStageForStatus,
  stageActions,
  stageCounts,
  stageLabel,
  stageTone,
  printStatusTone,
} from '@/lib/production';

const controlClass =
  'h-10 rounded-md border border-line-2 bg-canvas px-3 text-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]';

function isStage(value: string | null): value is ProductionStage {
  return value !== null && (PRODUCTION_LANES as string[]).includes(value);
}

export function ProductionView() {
  const searchParams = useSearchParams();
  const initialStage = searchParams.get('stage');

  const [jobs, setJobs] = useState<AdminProductionJob[] | null>(null);
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<ProductionStage | 'all'>(
    isStage(initialStage) ? initialStage : 'all',
  );
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    adminDataProvider.listProductionJobs().then((list) => {
      if (active) setJobs(list);
    });
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => (jobs ? stageCounts(jobs) : null), [jobs]);
  const groups = useMemo(
    () => (jobs ? groupByStage(filterJobs(jobs, { stage, query })) : []),
    [jobs, stage, query],
  );
  const now = new Date();

  function runAction(job: AdminProductionJob, actionId: string, actionLabel: string) {
    const nextStatus = applyStageAction(job.status, actionId);
    if (nextStatus === job.status) return;
    const nextStage = productionStageForStatus(nextStatus);
    setJobs((current) =>
      (current ?? []).flatMap((j) => {
        if (j.reference !== job.reference) return [j];
        if (!nextStage) return []; // left the board (e.g. delivered)
        const printStatus = printStatusForOrderStatus(nextStatus);
        return [
          {
            ...j,
            status: nextStatus,
            stage: nextStage,
            items: j.items.map((it) => ({ ...it, printStatus })),
          },
        ];
      }),
    );
    setNotice(
      nextStage
        ? `Preview build, “${actionLabel}” would call the fulfilment API. ${job.reference} moved to “${stageLabel(nextStage)}” locally (not saved).`
        : `Preview build, “${actionLabel}” would call the fulfilment API. ${job.reference} left the board locally (not saved).`,
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Operations</Eyebrow>
        <Heading as={1} size="display-lg" className="mt-2">
          Production &amp; fulfilment
        </Heading>
        <Text tone="secondary" className="mt-2">
          Work paid orders through printing, quality check and dispatch. Jobs are worked oldest
          first.
        </Text>
      </div>

      <Alert tone="info" title="Preview data">
        Jobs are derived from representative sample orders, the admin fulfilment API isn’t
        connected, so stage changes update the board locally and aren’t saved.
      </Alert>

      {/* Stage filter chips with live counts */}
      {counts ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by production stage">
          <FilterChip
            label="All active"
            count={jobs?.length ?? 0}
            active={stage === 'all'}
            onClick={() => setStage('all')}
          />
          {PRODUCTION_LANES.map((s) => (
            <FilterChip
              key={s}
              label={stageLabel(s)}
              count={counts[s]}
              tone={s === 'exception' ? 'danger' : 'default'}
              active={stage === s}
              onClick={() => setStage(stage === s ? 'all' : s)}
            />
          ))}
        </div>
      ) : null}

      {/* Search */}
      <div className="relative min-w-0 sm:max-w-xs">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <label htmlFor="production-search" className="sr-only">
          Search jobs
        </label>
        <input
          id="production-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reference or customer"
          className={cn(controlClass, 'w-full pl-9')}
        />
      </div>

      <div aria-live="polite" className="empty:hidden">
        {notice ? (
          <Alert tone="info" title="Preview">
            {notice}
          </Alert>
        ) : null}
      </div>

      {/* Board */}
      {!jobs ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line p-10 text-center">
          <Text tone="muted">No production jobs match your filters.</Text>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.stage} aria-labelledby={`lane-${group.stage}`}>
              <div className="mb-3 flex items-center gap-2">
                <Heading as={2} id={`lane-${group.stage}`} size="md">
                  {stageLabel(group.stage)}
                </Heading>
                <Badge tone={stageTone(group.stage)}>{group.jobs.length}</Badge>
              </div>
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.jobs.map((job) => (
                  <JobCard key={job.reference} job={job} now={now} onAction={runAction} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  tone = 'default',
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  tone?: 'default' | 'danger';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 rounded-[var(--radius-pill)] border px-3 py-1.5 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
        active
          ? 'border-accent bg-accent text-on-accent'
          : 'border-line-2 text-ink-2 hover:bg-canvas-2',
        !active && tone === 'danger' && count > 0 && 'text-error',
      )}
    >
      {label}
      <span
        className={cn(
          'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs tabular-nums',
          active ? 'bg-white/20' : 'bg-surface-2',
        )}
      >
        {count}
      </span>
    </button>
  );
}

function JobCard({
  job,
  now,
  onAction,
}: {
  job: AdminProductionJob;
  now: Date;
  onAction: (job: AdminProductionJob, actionId: string, actionLabel: string) => void;
}) {
  const actions = stageActions(job.status);
  const priority = isPriority(job, now);
  const showShipping = job.stage === 'dispatched' || job.stage === 'exception';

  return (
    <li className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={`/orders/${job.reference}`}
            className="inline-flex items-center gap-1 rounded-sm font-medium text-ink underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            {job.reference}
            <ChevronRight className="size-3.5 text-muted" aria-hidden />
          </Link>
          <Text size="sm" tone="secondary" className="mt-0.5">
            {job.customerName}
          </Text>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-1">
          <Badge tone={stageTone(job.stage)}>{stageLabel(job.stage)}</Badge>
          {priority ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-warning">
              <AlertTriangle className="size-3.5" aria-hidden />
              {formatAge(job.placedAt, now)} old
            </span>
          ) : (
            <span className="whitespace-nowrap text-xs text-muted">
              {formatAge(job.placedAt, now)} old
            </span>
          )}
        </div>
      </div>

      <ul className="space-y-1.5">
        {job.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate text-ink-2">
              {item.artworkTitle}
              <span className="text-muted">
                {' '}
                · {item.garment} · {item.colour} · {item.size}
                {item.quantity > 1 ? ` × ${item.quantity}` : ''}
              </span>
            </span>
            <Badge tone={printStatusTone(item.printStatus)}>
              {formatPrintStatus(item.printStatus)}
            </Badge>
          </li>
        ))}
      </ul>

      {showShipping ? (
        <Text size="sm" tone="muted">
          {job.deliveryMethodLabel} · {formatShippingStatus(job.shippingStatus)}
        </Text>
      ) : null}

      {actions.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          {actions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onAction(job, a.id, a.label)}
              className={cn(
                'inline-flex h-9 items-center rounded-md px-3 text-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                a.intent === 'primary'
                  ? 'bg-accent text-on-accent hover:brightness-110'
                  : a.intent === 'danger'
                    ? 'border border-[color:var(--color-error)] text-error hover:bg-canvas-2'
                    : 'border border-line-2 text-ink hover:bg-canvas-2',
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
    </li>
  );
}
