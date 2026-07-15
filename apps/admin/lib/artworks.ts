/**
 * Pure artwork-manager helpers — status presentation, the publishing lifecycle,
 * mockup approval and upload validation. Framework-free so they can be
 * unit-tested and reused by the list, detail and upload surfaces.
 */

import type {
  AdminArtworkSummary,
  ArtworkMockup,
  ArtworkStatus,
  MockupApproval,
} from './data/types';
import type { StatusTone } from './order-status';

// --- Status presentation -------------------------------------------------------

const STATUS_LABEL: Record<ArtworkStatus, string> = {
  draft: 'Draft',
  processing: 'Processing',
  needs_review: 'Needs review',
  ready: 'Ready',
  scheduled: 'Scheduled',
  published: 'Published',
  archived: 'Archived',
};

export function formatArtworkStatus(status: ArtworkStatus): string {
  return STATUS_LABEL[status];
}

export function artworkStatusTone(status: ArtworkStatus): StatusTone {
  switch (status) {
    case 'published':
      return 'success';
    case 'ready':
    case 'scheduled':
      return 'info';
    case 'needs_review':
      return 'warning';
    case 'processing':
      return 'accent';
    case 'archived':
      return 'error';
    default:
      return 'neutral';
  }
}

// --- Search / filter -----------------------------------------------------------

export function filterArtworks(
  artworks: AdminArtworkSummary[],
  opts: { query?: string; status?: ArtworkStatus | 'all' } = {},
): AdminArtworkSummary[] {
  const q = (opts.query ?? '').trim().toLowerCase();
  const status = opts.status ?? 'all';
  return artworks.filter((a) => {
    const matchesQuery =
      !q || a.title.toLowerCase().includes(q) || a.collection.toLowerCase().includes(q);
    return matchesQuery && (status === 'all' || a.status === status);
  });
}

// --- Publishing lifecycle ------------------------------------------------------

export type ArtworkAction =
  'publish' | 'schedule' | 'archive' | 'unpublish' | 'unschedule' | 'restore';

export interface ActionSpec {
  id: ArtworkAction;
  label: string;
  /** Primary actions are visually emphasised. */
  primary?: boolean;
}

/**
 * The lifecycle actions available from a given status. `needs_review` and
 * `processing` can't be published until they resolve, so they only expose
 * archive.
 */
export function artworkActions(status: ArtworkStatus): ActionSpec[] {
  switch (status) {
    case 'draft':
    case 'ready':
      return [
        { id: 'publish', label: 'Publish', primary: true },
        { id: 'schedule', label: 'Schedule' },
        { id: 'archive', label: 'Archive' },
      ];
    case 'scheduled':
      return [
        { id: 'publish', label: 'Publish now', primary: true },
        { id: 'unschedule', label: 'Unschedule' },
        { id: 'archive', label: 'Archive' },
      ];
    case 'published':
      return [
        { id: 'unpublish', label: 'Unpublish' },
        { id: 'archive', label: 'Archive' },
      ];
    case 'needs_review':
    case 'processing':
      return [{ id: 'archive', label: 'Archive' }];
    case 'archived':
      return [{ id: 'restore', label: 'Restore', primary: true }];
    default:
      return [];
  }
}

/** Apply a lifecycle action, returning the resulting status (unchanged if invalid). */
export function applyArtworkAction(status: ArtworkStatus, action: ArtworkAction): ArtworkStatus {
  const allowed = artworkActions(status).some((a) => a.id === action);
  if (!allowed) return status;
  switch (action) {
    case 'publish':
      return 'published';
    case 'schedule':
      return 'scheduled';
    case 'archive':
      return 'archived';
    case 'unpublish':
    case 'unschedule':
      return 'ready';
    case 'restore':
      return 'draft';
    default:
      return status;
  }
}

// --- Mockup approval -----------------------------------------------------------

export function setMockupApproval(
  mockups: ArtworkMockup[],
  id: string,
  approval: MockupApproval,
): ArtworkMockup[] {
  return mockups.map((m) => (m.id === id ? { ...m, approval } : m));
}

export interface ApprovalTally {
  approved: number;
  rejected: number;
  pending: number;
  total: number;
}

export function approvalTally(mockups: ArtworkMockup[]): ApprovalTally {
  return mockups.reduce<ApprovalTally>(
    (acc, m) => {
      acc.total += 1;
      acc[m.approval] += 1;
      return acc;
    },
    { approved: 0, rejected: 0, pending: 0, total: 0 },
  );
}

/** An artwork can be published once every mockup is approved. */
export function canPublish(mockups: ArtworkMockup[]): boolean {
  return mockups.length > 0 && mockups.every((m) => m.approval === 'approved');
}

// --- Upload validation ---------------------------------------------------------

export interface UploadValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const ACCEPTED_EXT = ['png', 'tif', 'tiff', 'svg'];
const MAX_MB = 40;

/**
 * Validate an artwork upload (name + size in bytes). Mirrors the checks the
 * server will run: accepted print-ready formats, a size ceiling, and a
 * resolution hint. Pure so the upload UI and tests share one source of truth.
 */
export function validateUpload(fileName: string, sizeBytes: number): UploadValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';

  if (!fileName.trim()) {
    errors.push('Choose a file to upload.');
  } else if (!ACCEPTED_EXT.includes(ext)) {
    errors.push(`Unsupported format “.${ext}”. Use a print-ready PNG, TIFF or SVG.`);
  }
  const mb = sizeBytes / (1024 * 1024);
  if (mb > MAX_MB) {
    errors.push(`File is ${mb.toFixed(1)}MB — the limit is ${MAX_MB}MB.`);
  }
  if (ext === 'png' && mb > 0 && mb < 2) {
    warnings.push('This PNG is small — check it’s high-resolution enough for large prints.');
  }

  return { ok: errors.length === 0, errors, warnings };
}
