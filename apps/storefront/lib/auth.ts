/**
 * Mock authentication for the preview storefront. There is no auth backend yet
 * (TMS-FBR-005), so this models a **demo session** entirely client-side:
 *
 * - Accounts are a local list of `{ email, name }`, **no passwords are ever
 *   stored** (client-side password storage would be a bad pattern to model).
 * - Register adds an account (rejecting duplicate emails) and starts a session.
 * - Login looks the email up and starts a session; the password is validated
 *   for shape but, with nothing to check it against, is not verified in the
 *   preview. The UI says so plainly.
 *
 * Replace with real sign-up / sign-in + session cookies once the auth API lands.
 */

import { isValidEmail } from './checkout';

export interface Account {
  email: string;
  name: string;
}

export type SessionUser = Account;

export type AuthErrors = Record<string, string>;

export const MIN_PASSWORD_LENGTH = 8;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  confirm: string;
}

export function validateRegister(input: RegisterInput): AuthErrors {
  const errors: AuthErrors = {};
  if (!input.name.trim()) errors.name = 'Enter your name.';
  if (!input.email.trim()) errors.email = 'Enter your email address.';
  else if (!isValidEmail(input.email)) errors.email = 'Enter a valid email address.';
  if (!input.password) errors.password = 'Choose a password.';
  else if (input.password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (input.confirm !== input.password) errors.confirm = 'Passwords do not match.';
  return errors;
}

export interface LoginInput {
  email: string;
  password: string;
}

export function validateLogin(input: LoginInput): AuthErrors {
  const errors: AuthErrors = {};
  if (!input.email.trim()) errors.email = 'Enter your email address.';
  else if (!isValidEmail(input.email)) errors.email = 'Enter a valid email address.';
  if (!input.password) errors.password = 'Enter your password.';
  return errors;
}

export function findAccount(accounts: Account[], email: string): Account | undefined {
  const key = normalizeEmail(email);
  return accounts.find((a) => a.email === key);
}

/** Return a new accounts list with `account` added (caller checks for dupes). */
export function addAccount(accounts: Account[], account: Account): Account[] {
  return [...accounts, { email: normalizeEmail(account.email), name: account.name.trim() }];
}

// --- Persistence ---------------------------------------------------------------

const ACCOUNTS_KEY = 'tms.accounts.v1';
const SESSION_KEY = 'tms.session.v1';

export function readAccounts(): Account[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as Account[]) : [];
  } catch {
    return [];
  }
}

export function writeAccounts(accounts: Account[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // storage unavailable, session still works for this tab
  }
}

export function readSession(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function writeSession(user: SessionUser | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // no-op
  }
}
