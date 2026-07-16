/**
 * Pure error-centre helpers, safe presentation of integration failures and the
 * resolution lifecycle. **No stack traces or secrets ever pass through here**
 * (spec §18): an entry only carries a correlation ID and a human summary.
 * Framework-free so it can be unit-tested and shared by the error-centre view.
 */

import type { AdminErrorEntry, ErrorResolution, ErrorSeverity, ErrorSource } from './data/types';
import type { StatusTone } from './order-status';

// --- Presentation --------------------------------------------------------------

const SOURCE_LABEL: Record<ErrorSource, string> = {
  payment: 'Payment',
  webhook: 'Webhook',
  shipping: 'Shipping',
  image_processing: 'Image processing',
  email: 'Email',
  ai: 'AI',
  background_job: 'Background job',
};

export function formatErrorSource(source: ErrorSource): string {
  return SOURCE_LABEL[source];
}

const SEVERITY_LABEL: Record<ErrorSeverity, string> = {
  critical: 'Critical',
  error: 'Error',
  warning: 'Warning',
};

export function formatSeverity(severity: ErrorSeverity): string {
  return SEVERITY_LABEL[severity];
}

export function severityTone(severity: ErrorSeverity): StatusTone {
  switch (severity) {
    case 'critical':
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    default:
      return 'neutral';
  }
}

const RESOLUTION_LABEL: Record<ErrorResolution, string> = {
  open: 'Open',
  investigating: 'Investigating',
  retrying: 'Retrying',
  resolved: 'Resolved',
  ignored: 'Ignored',
};

export function formatResolution(resolution: ErrorResolution): string {
  return RESOLUTION_LABEL[resolution];
}

export function resolutionTone(resolution: ErrorResolution): StatusTone {
  switch (resolution) {
    case 'resolved':
      return 'success';
    case 'ignored':
      return 'neutral';
    case 'retrying':
    case 'investigating':
      return 'info';
    default:
      // open, needs attention.
      return 'warning';
  }
}

/** Unresolved = still needs someone: open, investigating, or retrying. */
export function isUnresolved(resolution: ErrorResolution): boolean {
  return resolution === 'open' || resolution === 'investigating' || resolution === 'retrying';
}

/** Count of failures still needing attention. */
export function openCount(errors: AdminErrorEntry[]): number {
  return errors.filter((e) => isUnresolved(e.resolution)).length;
}

// --- Filtering -----------------------------------------------------------------

export interface ErrorFilterParams {
  source?: ErrorSource | 'all';
  resolution?: ErrorResolution | 'all';
  query?: string;
}

export function filterErrors(
  errors: AdminErrorEntry[],
  params: ErrorFilterParams = {},
): AdminErrorEntry[] {
  const q = (params.query ?? '').trim().toLowerCase();
  const source = params.source ?? 'all';
  const resolution = params.resolution ?? 'all';
  return errors.filter((e) => {
    const matchesSource = source === 'all' || e.source === source;
    const matchesResolution = resolution === 'all' || e.resolution === resolution;
    const matchesQuery =
      !q ||
      e.correlationId.toLowerCase().includes(q) ||
      (e.affectedOrder?.toLowerCase().includes(q) ?? false) ||
      e.message.toLowerCase().includes(q);
    return matchesSource && matchesResolution && matchesQuery;
  });
}

// --- Resolution lifecycle ------------------------------------------------------

export type ErrorAction = 'retry' | 'investigate' | 'resolve' | 'ignore' | 'reopen';

export interface ErrorActionSpec {
  id: ErrorAction;
  label: string;
  intent?: 'primary' | 'default' | 'danger';
}

/** The actions available for an entry, gated on its resolution + retryability. */
export function errorActions(
  entry: Pick<AdminErrorEntry, 'resolution' | 'retryable'>,
): ErrorActionSpec[] {
  const retry: ErrorActionSpec[] = entry.retryable
    ? [{ id: 'retry', label: 'Retry', intent: 'primary' }]
    : [];
  switch (entry.resolution) {
    case 'open':
      return [
        ...retry,
        { id: 'investigate', label: 'Investigate' },
        { id: 'resolve', label: 'Mark resolved' },
        { id: 'ignore', label: 'Ignore' },
      ];
    case 'investigating':
      return [
        ...retry,
        { id: 'resolve', label: 'Mark resolved' },
        { id: 'ignore', label: 'Ignore' },
      ];
    case 'retrying':
      return [
        { id: 'resolve', label: 'Mark resolved' },
        { id: 'reopen', label: 'Reopen' },
      ];
    case 'resolved':
    case 'ignored':
      return [{ id: 'reopen', label: 'Reopen' }];
    default:
      return [];
  }
}

const ACTION_RESULT: Record<ErrorAction, ErrorResolution> = {
  retry: 'retrying',
  investigate: 'investigating',
  resolve: 'resolved',
  ignore: 'ignored',
  reopen: 'open',
};

/**
 * Apply an action, returning the resulting resolution. Actions not offered from
 * the current state (or a retry on a non-retryable entry) leave it unchanged.
 */
export function applyErrorAction(
  entry: Pick<AdminErrorEntry, 'resolution' | 'retryable'>,
  action: ErrorAction,
): ErrorResolution {
  const allowed = errorActions(entry).some((a) => a.id === action);
  return allowed ? ACTION_RESULT[action] : entry.resolution;
}
