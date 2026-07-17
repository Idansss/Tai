import type { CommunityPhoto, ModerationStatus } from './data/types';

/**
 * Pure domain logic for the community gallery (TMS-F5-005). The public display
 * is moderation-aware: only `approved` photos are ever shown. These helpers make
 * that rule a single, unit-tested function rather than an ad-hoc filter repeated
 * across the UI. Real moderation is server-side (TMS-FBR-008); the client must
 * never surface pending/rejected UGC to the public.
 */

/** Whether a photo may be shown publicly. */
export function isPublic(photo: CommunityPhoto): boolean {
  return photo.status === 'approved';
}

/** Keep only publicly-displayable (approved) photos, preserving order. */
export function filterApproved(photos: CommunityPhoto[]): CommunityPhoto[] {
  return photos.filter(isPublic);
}

export function moderationLabel(status: ModerationStatus): string {
  switch (status) {
    case 'approved':
      return 'Published';
    case 'pending':
      return 'In review';
    case 'rejected':
      return 'Not published';
  }
}

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'error' | 'info';

export function moderationTone(status: ModerationStatus): BadgeTone {
  switch (status) {
    case 'approved':
      return 'success';
    case 'pending':
      return 'warning';
    case 'rejected':
      return 'neutral';
  }
}

export const MAX_CAPTION = 140;
const HANDLE_RE = /^@?[a-z0-9._]{2,30}$/i;

export interface PhotoSubmission {
  handle: string;
  caption: string;
  /** Whether the customer attached a photo (mock — no real file is uploaded). */
  hasPhoto: boolean;
}

export type SubmissionFieldErrors = Partial<Record<keyof PhotoSubmission, string>>;

export type SubmissionValidation = { ok: true } | { ok: false; errors: SubmissionFieldErrors };

/** Validate a submit-a-photo submission. Pure — the form and any API share it. */
export function validatePhotoSubmission(input: PhotoSubmission): SubmissionValidation {
  const errors: SubmissionFieldErrors = {};
  if (!HANDLE_RE.test(input.handle.trim())) {
    errors.handle = 'Add a handle (letters, numbers, dots or underscores).';
  }
  const caption = input.caption.trim();
  if (caption.length === 0) {
    errors.caption = 'Add a short caption.';
  } else if (caption.length > MAX_CAPTION) {
    errors.caption = `Keep the caption under ${MAX_CAPTION} characters.`;
  }
  if (!input.hasPhoto) {
    errors.hasPhoto = 'Choose a photo to share.';
  }
  return Object.keys(errors).length === 0 ? { ok: true } : { ok: false, errors };
}

/** Normalise a handle to a leading-@ form for display. */
export function formatHandle(handle: string): string {
  const trimmed = handle.trim().replace(/^@+/, '');
  return `@${trimmed}`;
}
