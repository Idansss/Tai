/**
 * Mock staff authentication for the preview admin console. There is no admin
 * auth backend yet (no real staff accounts, roles or SSO), so this models a
 * **demo staff session** entirely client-side:
 *
 * - Sign-in validates the email/password *shape* only; with nothing to check
 *   credentials against, any well-formed sign-in starts a demo session. The UI
 *   says so plainly.
 * - The session is a `{ email, name }` object in `localStorage` — **no password
 *   is ever stored**.
 *
 * Replace with real staff auth + role-based access control (RBAC) and an
 * httpOnly session cookie once the admin auth API lands (TMS-FBR-006).
 */

export interface StaffUser {
  email: string;
  name: string;
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

// --- Persistence ---------------------------------------------------------------

const SESSION_KEY = 'tms.admin.session.v1';

export function readStaffSession(): StaffUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StaffUser) : null;
  } catch {
    return null;
  }
}

export function writeStaffSession(user: StaffUser | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // storage unavailable — session still works for this tab
  }
}
