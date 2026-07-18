/**
 * Saved designs against the real API.
 *
 * Rules the backend has fixed, encoded here:
 *
 * - **Saving is idempotent.** 201 means a new design, 200 means you already had this one. A 200
 *   is success, not an error — re-saving the same design must feel like saving, not fail.
 * - **Quantity is not part of a design** (ADR-014). `SaveDesignInput` has no quantity field, so
 *   re-saving the same design at a different quantity cannot fork it. Quantity is cart state.
 * - **A design you do not own answers 404, never 403.** There is no "forbidden" state to render;
 *   someone else's design is simply not found.
 * - **Rotating a share link immediately breaks the previous URL.** That is destructive to anyone
 *   holding the old link, so the UI must say so before rotating.
 */
import type {
  DesignConfigurationSummary,
  SaveDesignInput,
  UpdateDesignInput,
} from '@tms/contracts';

import { ApiRequestError, apiFetch, apiFetchOrNull } from './data/http';
import { API_BASE_URL } from './data/http';

export interface SaveDesignResult {
  design: DesignConfigurationSummary;
  /** False when the server recognised this exact tuple and returned the design you already had. */
  created: boolean;
}

export function listDesigns(cookie?: string): Promise<DesignConfigurationSummary[]> {
  return apiFetch<DesignConfigurationSummary[]>('/api/v1/designs', {
    cache: 'no-store',
    ...(cookie ? { cookie } : {}),
  });
}

/**
 * Save a design.
 *
 * `apiFetch` unwraps the envelope and hides the status, but 201-vs-200 is the difference between
 * "saved" and "you already had this", which the UI should say out loud. So this one call reads the
 * status directly rather than pretending the distinction does not exist.
 */
export async function saveDesign(input: SaveDesignInput): Promise<SaveDesignResult> {
  const response = await fetch(`${API_BASE_URL}/api/v1/designs`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiRequestError({
      code: (error?.code as ApiRequestError['code']) ?? 'INTERNAL_ERROR',
      message: error?.message ?? `Saving the design failed with status ${response.status}.`,
      status: response.status,
    });
  }

  return {
    design: (payload as { data: DesignConfigurationSummary }).data,
    // 201 Created is a new design; 200 OK means this exact tuple was already saved.
    created: response.status === 201,
  };
}

/** A design you do not own is a 404, so null means "not yours or not there" — never "forbidden". */
export function getDesign(id: string): Promise<DesignConfigurationSummary | null> {
  return apiFetchOrNull<DesignConfigurationSummary>(`/api/v1/designs/${encodeURIComponent(id)}`, {
    cache: 'no-store',
  });
}

export function updateDesign(
  id: string,
  input: UpdateDesignInput,
): Promise<DesignConfigurationSummary> {
  return apiFetch<DesignConfigurationSummary>(`/api/v1/designs/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteDesign(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/designs/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/**
 * Create or rotate a design's share link.
 *
 * Rotation is not additive: the moment this returns, any previously shared URL is dead. Callers
 * must confirm with the customer first — someone may be holding the old link.
 */
export function rotateDesignShare(id: string): Promise<DesignConfigurationSummary> {
  return apiFetch<DesignConfigurationSummary>(`/api/v1/designs/${encodeURIComponent(id)}/share`, {
    method: 'POST',
  });
}

/** Read a design someone shared with you. Public: no session required. */
export function getSharedDesign(token: string): Promise<DesignConfigurationSummary | null> {
  return apiFetchOrNull<DesignConfigurationSummary>(
    `/api/v1/shared-designs/${encodeURIComponent(token)}`,
    { cache: 'no-store' },
  );
}

/** The public URL for an unlisted design, or null while it has no share token. */
export function designShareUrl(design: DesignConfigurationSummary, origin: string): string | null {
  return design.shareToken ? `${origin}/shared-designs/${design.shareToken}` : null;
}
