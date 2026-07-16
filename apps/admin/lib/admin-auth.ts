/**
 * Staff authentication for the admin console. Backed by a **real server session**
 * (httpOnly cookie) issued by the CMS auth routes (`/api/cms/auth/*`), which
 * authenticate against `cms.admin_users` with hashed passwords and enforce
 * role-based permissions server-side. This is the interim admin identity until
 * Codex's admin auth + granular RBAC (TMS-FBR-006 / B1-003) lands, at which point
 * these routes proxy `/api/v1/admin/auth`.
 */

/** A permission code the server grants per role (mirrors @tms/site-content). */
export type Permission =
  | 'content.read'
  | 'content.write'
  | 'content.publish'
  | 'content.delete'
  | 'settings.read'
  | 'settings.write'
  | 'staff.read'
  | 'staff.write'
  | 'audit.read'
  | 'media.write';

export type AdminRole = 'OWNER' | 'ADMINISTRATOR' | 'RESTRICTED_STAFF';

export interface AdminIdentity {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: Permission[];
}

export type AuthErrors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Derive a friendly display name from an email local-part, e.g. "ada.okoro" → "Ada Okoro". */
export function nameFromEmail(email: string): string {
  const local = normalizeEmail(email).split('@')[0] ?? 'staff';
  const words = local
    .split(/[.\-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return words.join(' ') || 'Staff';
}

export interface LoginInput {
  email: string;
  password: string;
}

export function validateLogin(input: LoginInput): AuthErrors {
  const errors: AuthErrors = {};
  if (!input.email.trim()) errors.email = 'Enter your work email.';
  else if (!isValidEmail(input.email)) errors.email = 'Enter a valid email address.';
  if (!input.password) errors.password = 'Enter your password.';
  return errors;
}

export function hasPermission(identity: AdminIdentity | null, permission: Permission): boolean {
  return identity?.permissions.includes(permission) ?? false;
}

// --- Server session API --------------------------------------------------------

export interface LoginResult {
  ok: boolean;
  identity?: AdminIdentity;
  error?: string;
}

/** Authenticate against the server; the session cookie is set by the response. */
export async function apiLogin(input: LoginInput): Promise<LoginResult> {
  try {
    const res = await fetch('/api/cms/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => ({}))) as {
      identity?: AdminIdentity;
      error?: string;
    };
    if (!res.ok) return { ok: false, error: data.error ?? 'Sign in failed.' };
    return { ok: true, identity: data.identity };
  } catch {
    return { ok: false, error: 'Network error. Please try again.' };
  }
}

export async function apiLogout(): Promise<void> {
  try {
    await fetch('/api/cms/auth/logout', { method: 'POST' });
  } catch {
    // best effort; the cookie is cleared server-side
  }
}

/** Hydrate the current session from the cookie, or null if signed out. */
export async function apiSession(): Promise<AdminIdentity | null> {
  try {
    const res = await fetch('/api/cms/auth/session', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { identity: AdminIdentity | null };
    return data.identity;
  } catch {
    return null;
  }
}
