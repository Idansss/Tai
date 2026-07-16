/**
 * Pure production / QC / fulfilment helpers — the board's stage model, the stage
 * transition machine (advance / QC pass / reprint / flag exception), grouping,
 * counts, and age formatting. Framework-free so they can be unit-tested and
 * shared by the board view.
 *
 * A production job is just an order seen through its `OrderStatus`: the pipeline
 * stages map onto the shared `@tms/contracts` order state machine so the mock and
 * a real backend speak the same language (no parallel enum to drift).
 */

import type { OrderStatus } from '@tms/contracts';
import type { AdminProductionJob, PrintStatus, ProductionStage } from './data/types';
import type { StatusTone } from './order-status';

// --- Stage model ---------------------------------------------------------------

/** The active board lanes, in pipeline order. `exception` sits at the end. */
export const PRODUCTION_LANES: ProductionStage[] = [
  'paid',
  'queued',
  'printing',
  'quality_check',
  'ready_for_dispatch',
  'dispatched',
  'exception',
];

const STAGE_FOR_STATUS: Partial<Record<OrderStatus, ProductionStage>> = {
  PAID: 'paid',
  PRODUCTION_QUEUED: 'queued',
  PRINTING: 'printing',
  QUALITY_CHECK: 'quality_check',
  READY_FOR_DISPATCH: 'ready_for_dispatch',
  SHIPMENT_BOOKED: 'dispatched',
  SHIPPED: 'dispatched',
  DELIVERY_EXCEPTION: 'exception',
};

/**
 * The board lane for an order status, or `null` when the order is off the board
 * (pre-payment, delivered/completed, cancelled or refunded).
 */
export function productionStageForStatus(status: OrderStatus): ProductionStage | null {
  return STAGE_FOR_STATUS[status] ?? null;
}

const STAGE_LABEL: Record<ProductionStage, string> = {
  paid: 'Awaiting production',
  queued: 'Production queued',
  printing: 'Printing',
  quality_check: 'Quality check',
  ready_for_dispatch: 'Ready for dispatch',
  dispatched: 'Dispatched',
  exception: 'Delivery exception',
};

export function stageLabel(stage: ProductionStage): string {
  return STAGE_LABEL[stage];
}

export function stageTone(stage: ProductionStage): StatusTone {
  switch (stage) {
    case 'ready_for_dispatch':
    case 'dispatched':
      return 'success';
    case 'quality_check':
      return 'accent';
    case 'exception':
      return 'error';
    case 'paid':
      return 'info';
    default:
      // queued / printing — work in progress.
      return 'warning';
  }
}

// --- Stage transitions ---------------------------------------------------------

export interface StageAction {
  id: string;
  label: string;
  /** The order status this action moves the job to. */
  toStatus: OrderStatus;
  /** Primary actions advance the happy path; danger actions are corrective. */
  intent?: 'primary' | 'default' | 'danger';
}

/** The actions available from a given order status on the board. */
export function stageActions(status: OrderStatus): StageAction[] {
  const stage = productionStageForStatus(status);
  switch (stage) {
    case 'paid':
      return [
        {
          id: 'queue',
          label: 'Move to production',
          toStatus: 'PRODUCTION_QUEUED',
          intent: 'primary',
        },
      ];
    case 'queued':
      return [{ id: 'print', label: 'Start printing', toStatus: 'PRINTING', intent: 'primary' }];
    case 'printing':
      return [{ id: 'qc', label: 'Send to QC', toStatus: 'QUALITY_CHECK', intent: 'primary' }];
    case 'quality_check':
      return [
        { id: 'pass', label: 'QC pass', toStatus: 'READY_FOR_DISPATCH', intent: 'primary' },
        { id: 'reprint', label: 'Reprint', toStatus: 'PRINTING', intent: 'danger' },
      ];
    case 'ready_for_dispatch':
      return [
        {
          id: 'dispatch',
          label: 'Book & dispatch',
          toStatus: 'SHIPMENT_BOOKED',
          intent: 'primary',
        },
      ];
    case 'dispatched':
      return [
        { id: 'delivered', label: 'Mark delivered', toStatus: 'DELIVERED', intent: 'primary' },
        {
          id: 'exception',
          label: 'Flag exception',
          toStatus: 'DELIVERY_EXCEPTION',
          intent: 'danger',
        },
      ];
    case 'exception':
      return [
        { id: 'retry', label: 'Retry dispatch', toStatus: 'READY_FOR_DISPATCH', intent: 'primary' },
      ];
    default:
      return [];
  }
}

/**
 * Apply a stage action, returning the resulting order status. Unknown actions
 * (not offered from the current status) leave the status unchanged.
 */
export function applyStageAction(status: OrderStatus, actionId: string): OrderStatus {
  const action = stageActions(status).find((a) => a.id === actionId);
  return action ? action.toStatus : status;
}

// --- Grouping / counts ---------------------------------------------------------

export interface StageFilterParams {
  stage?: ProductionStage | 'all';
  query?: string;
}

export function filterJobs(
  jobs: AdminProductionJob[],
  params: StageFilterParams = {},
): AdminProductionJob[] {
  const q = (params.query ?? '').trim().toLowerCase();
  const stage = params.stage ?? 'all';
  return jobs.filter((j) => {
    const matchesStage = stage === 'all' || j.stage === stage;
    const matchesQuery =
      !q || j.reference.toLowerCase().includes(q) || j.customerName.toLowerCase().includes(q);
    return matchesStage && matchesQuery;
  });
}

export interface StageGroup {
  stage: ProductionStage;
  jobs: AdminProductionJob[];
}

/** Group jobs into the pipeline lanes, preserving lane order; empty lanes drop out. */
export function groupByStage(jobs: AdminProductionJob[]): StageGroup[] {
  return PRODUCTION_LANES.map((stage) => ({
    stage,
    jobs: jobs.filter((j) => j.stage === stage),
  })).filter((g) => g.jobs.length > 0);
}

/** Count jobs per lane (every lane present, zero when empty). */
export function stageCounts(jobs: AdminProductionJob[]): Record<ProductionStage, number> {
  const counts = Object.fromEntries(PRODUCTION_LANES.map((s) => [s, 0])) as Record<
    ProductionStage,
    number
  >;
  for (const j of jobs) counts[j.stage] += 1;
  return counts;
}

// --- Age / priority ------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** A compact "time since placed" label, e.g. "3d", "5h", "just now". */
export function formatAge(fromIso: string, now: Date = new Date()): string {
  const ms = now.getTime() - new Date(fromIso).getTime();
  if (ms < HOUR_MS) return 'just now';
  if (ms < DAY_MS) return `${Math.floor(ms / HOUR_MS)}h`;
  return `${Math.floor(ms / DAY_MS)}d`;
}

/** In-production jobs older than this (excluding dispatched) are flagged urgent. */
export const PRIORITY_AGE_DAYS = 2;

export function isPriority(job: AdminProductionJob, now: Date = new Date()): boolean {
  if (job.stage === 'dispatched') return false;
  const ageMs = now.getTime() - new Date(job.placedAt).getTime();
  return ageMs >= PRIORITY_AGE_DAYS * DAY_MS;
}

// --- Print status presentation -------------------------------------------------

const PRINT_LABEL: Record<PrintStatus, string> = {
  queued: 'Queued',
  printing: 'Printing',
  printed: 'Printed',
  qc_passed: 'QC passed',
  reprint: 'Reprint',
};

export function formatPrintStatus(status: PrintStatus): string {
  return PRINT_LABEL[status];
}

export function printStatusTone(status: PrintStatus): StatusTone {
  switch (status) {
    case 'qc_passed':
      return 'success';
    case 'printing':
    case 'printed':
      return 'info';
    case 'reprint':
      return 'error';
    default:
      return 'neutral';
  }
}

/**
 * The per-line print state implied by an order status. Lines are modelled
 * uniformly (the whole order moves together); a real backend tracks each line.
 */
export function printStatusForOrderStatus(status: OrderStatus): PrintStatus {
  switch (status) {
    case 'PRINTING':
      return 'printing';
    case 'QUALITY_CHECK':
      return 'printed';
    case 'READY_FOR_DISPATCH':
    case 'SHIPMENT_BOOKED':
    case 'SHIPPED':
    case 'DELIVERED':
    case 'COMPLETED':
    case 'DELIVERY_EXCEPTION':
      return 'qc_passed';
    default:
      return 'queued';
  }
}
