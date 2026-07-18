/**
 * The single HTTP foundation for talking to the From Africa To You API.
 *
 * Everything the storefront reads from the backend goes through `apiFetch`, so the
 * envelope, the error mapping and the cookie policy are defined exactly once.
 *
 * Transport rules the backend has fixed (see docs/coordination/BACKEND_TO_FRONTEND.md):
 * - Sessions are opaque HttpOnly cookies (`tms_session` for customers, `tms_cart` for
 *   guests). Browser code must never read or persist them; it just has to send them,
 *   hence `credentials: 'include'` on every request.
 * - Success responses are `{ data, meta }` and errors are `{ error: { code, ... } }`.
 * - A resource the caller does not own answers 404, never 403, so "not found" and
 *   "not yours" are deliberately indistinguishable here too.
 */
import type { ApiErrorResponse, ApiResponse, ErrorCode } from '@tms/contracts';

/**
 * Where the API lives. Public because the browser calls it directly; same-origin in
 * production via a rewrite, which is what keeps the cookies first-party.
 */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(
  /\/$/,
  '',
);

/** The API answered, and it said no. Carries the machine-readable code the UI branches on. */
export class ApiRequestError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly correlationId: string | null;
  readonly details: ReadonlyArray<{ field?: string; message: string }>;

  constructor(init: {
    code: ErrorCode;
    message: string;
    status: number;
    correlationId?: string | null;
    details?: ReadonlyArray<{ field?: string; message: string }>;
  }) {
    super(init.message);
    this.name = 'ApiRequestError';
    this.code = init.code;
    this.status = init.status;
    this.correlationId = init.correlationId ?? null;
    this.details = init.details ?? [];
  }
}

/**
 * The API never answered: offline, DNS, TLS, timeout, or a body that was not the
 * envelope. Distinct from ApiRequestError so the UI can offer "retry" rather than
 * explaining a rejection that never happened.
 */
export class ApiNetworkError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'ApiNetworkError';
  }
}

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** Serialised as JSON. Never put a price in here; the server resolves money itself. */
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /**
   * Server components do not inherit the browser's cookie jar, so a caller running on
   * the server must forward it explicitly for anything session- or cart-scoped.
   */
  cookie?: string;
  /** Catalogue reads may be cached; cart and session reads must not be. */
  cache?: RequestCache;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: ApiFetchOptions['query']): string {
  const url = new URL(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function isErrorResponse(body: unknown): body is ApiErrorResponse {
  return (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as ApiErrorResponse).error?.code === 'string'
  );
}

/**
 * Perform a request and unwrap `{ data }`.
 *
 * @throws ApiRequestError when the API returns an error envelope.
 * @throws ApiNetworkError when the request never completed or the body was not an envelope.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, query, cookie, cache, signal } = options;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      // Sends tms_session / tms_cart, and lets the API set the guest cart cookie.
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...(cache ? { cache } : {}),
      ...(signal ? { signal } : {}),
    });
  } catch (cause) {
    throw new ApiNetworkError(
      `Could not reach the From Africa To You API at ${API_BASE_URL}.`,
      cause,
    );
  }

  // 204 has no body: logout and delete answer this way.
  if (response.status === 204) return undefined as T;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    if (response.ok) {
      throw new ApiNetworkError(`The API returned a malformed response for ${path}.`, cause);
    }
    throw new ApiRequestError({
      code: 'INTERNAL_ERROR',
      message: `The API failed with status ${response.status}.`,
      status: response.status,
    });
  }

  if (!response.ok || isErrorResponse(payload)) {
    if (isErrorResponse(payload)) {
      throw new ApiRequestError({
        code: payload.error.code,
        message: payload.error.message,
        status: response.status,
        correlationId: payload.error.correlationId,
        details: payload.error.details,
      });
    }
    throw new ApiRequestError({
      code: 'INTERNAL_ERROR',
      message: `The API failed with status ${response.status}.`,
      status: response.status,
    });
  }

  return (payload as ApiResponse<T>).data;
}

/**
 * Like `apiFetch`, but resolves to null for a missing resource so callers can render an
 * empty state. Only RESOURCE_NOT_FOUND is swallowed: every other rejection still throws,
 * because "the API is broken" must never look like "this artwork does not exist".
 */
export async function apiFetchOrNull<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T | null> {
  try {
    return await apiFetch<T>(path, options);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}
