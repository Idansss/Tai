/**
 * Internal order notes for the admin console. There is no notes API yet
 * (TMS-FBR-007), so notes are stored client-side per order reference in
 * `localStorage`. The pure `addNote`/`removeNote` transforms are unit-tested;
 * the read/write wrappers handle persistence. Swap for the real endpoint later.
 */

export interface InternalNote {
  id: string;
  author: string;
  body: string;
  at: string;
}

/** Prepend a note (newest first). */
export function addNote(notes: InternalNote[], note: InternalNote): InternalNote[] {
  return [note, ...notes];
}

export function removeNote(notes: InternalNote[], id: string): InternalNote[] {
  return notes.filter((n) => n.id !== id);
}

/** Create a note from a body + author, trimming and stamping it. Null if empty. */
export function makeNote(body: string, author: string, now = new Date()): InternalNote | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  return {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    author,
    body: trimmed,
    at: now.toISOString(),
  };
}

// --- Persistence ---------------------------------------------------------------

const NOTES_KEY = 'tms.admin.notes.v1';

type NotesByRef = Record<string, InternalNote[]>;

function readAll(): NotesByRef {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(NOTES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === 'object' ? (parsed as NotesByRef) : {};
  } catch {
    return {};
  }
}

export function readNotes(reference: string): InternalNote[] {
  const list = readAll()[reference];
  return Array.isArray(list) ? list : [];
}

export function writeNotes(reference: string, notes: InternalNote[]): void {
  if (typeof window === 'undefined') return;
  try {
    const all = readAll();
    all[reference] = notes;
    window.localStorage.setItem(NOTES_KEY, JSON.stringify(all));
  } catch {
    // storage unavailable — notes live for this tab only
  }
}
