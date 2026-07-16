import { normalizeEmail } from './auth';
import { isValidEmail } from './checkout';

/**
 * Waitlist / back-in-stock capture (TMS-F5-002). This is a **client-side preview
 * store**, joined emails live in `localStorage`, keyed by a list id, and no real
 * notification is ever sent. The server owns the real waitlist + notify pipeline
 * (TMS-FBR-008). The pure helpers here (validation, add/has) are unit-tested; the
 * thin `localStorage` wrappers are guarded for SSR.
 */

export interface WaitlistEntry {
  email: string;
  joinedAt: string;
}

export type WaitlistKind = 'product' | 'drop' | 'artwork';

/** Storage sub-key for a waitlist, e.g. `product:midnight-in-lagos-classic-tee`. */
export function waitlistKey(kind: WaitlistKind, id: string): string {
  return `${kind}:${id}`;
}

/** True if `email` (case-insensitively) is already on the list. */
export function hasEmail(entries: WaitlistEntry[], email: string): boolean {
  const target = normalizeEmail(email);
  return entries.some((e) => normalizeEmail(e.email) === target);
}

/**
 * Pure add: returns the list unchanged if the email is already present
 * (case-insensitive), otherwise appends a normalised entry. Never mutates input.
 */
export function addEntry(
  entries: WaitlistEntry[],
  email: string,
  now: number = Date.now(),
): WaitlistEntry[] {
  if (hasEmail(entries, email)) return entries;
  return [...entries, { email: normalizeEmail(email), joinedAt: new Date(now).toISOString() }];
}

const STORAGE_KEY = 'tms.waitlist.v1';

type WaitlistMap = Record<string, WaitlistEntry[]>;

function readMap(): WaitlistMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === 'object' ? (parsed as WaitlistMap) : {};
  } catch {
    return {};
  }
}

export function readWaitlist(key: string): WaitlistEntry[] {
  const list = readMap()[key];
  return Array.isArray(list) ? list : [];
}

function writeWaitlist(key: string, entries: WaitlistEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    const map = readMap();
    map[key] = entries;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / disabled storage, preview only
  }
}

export type JoinResult = { ok: true; alreadyJoined: boolean } | { ok: false; error: string };

/**
 * Validate + persist a waitlist join. Returns `alreadyJoined` when the email was
 * already on the list (idempotent), or a typed error for an invalid address.
 */
export function joinWaitlist(key: string, email: string): JoinResult {
  const trimmed = email.trim();
  if (!trimmed) return { ok: false, error: 'Enter your email address.' };
  if (!isValidEmail(trimmed)) return { ok: false, error: 'Enter a valid email address.' };
  const entries = readWaitlist(key);
  if (hasEmail(entries, trimmed)) return { ok: true, alreadyJoined: true };
  writeWaitlist(key, addEntry(entries, trimmed));
  return { ok: true, alreadyJoined: false };
}
