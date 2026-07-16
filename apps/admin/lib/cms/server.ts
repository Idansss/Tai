import {
  ConflictError,
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
  can,
  getSiteContentClient,
  resolveSession,
  SESSION_COOKIE,
  type AdminIdentity,
  type Permission,
  type SiteContentClient,
} from '@tms/site-content';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/** The shared CMS Prisma client (cms schema). Server-only. */
export function cms(): SiteContentClient {
  return getSiteContentClient();
}

/** Resolve the signed-in admin from the session cookie, or null. */
export async function getCmsIdentity(): Promise<AdminIdentity | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return resolveSession(cms(), token);
}

export class ApiAuthError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = 'ApiAuthError';
  }
}

/**
 * Enforce authentication (and optionally a permission) for a route handler.
 * Throws an `ApiAuthError` that `handleApiError` maps to 401/403 — the server is
 * the authority; the UI only mirrors what this refuses.
 */
export async function requireApi(permission?: Permission): Promise<AdminIdentity> {
  const identity = await getCmsIdentity();
  if (!identity) {
    throw new ApiAuthError(401, 'Sign in to continue.');
  }
  if (permission && !can(identity.role, permission)) {
    throw new ApiAuthError(403, `Your role cannot perform this action (${permission}).`);
  }
  return identity;
}

/** Map domain + auth errors to safe JSON problem responses (never leak internals). */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof PermissionDeniedError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: error.message, fieldErrors: error.fieldErrors },
      { status: 422 },
    );
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof ConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  console.error('[cms] unhandled API error', error);
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}
