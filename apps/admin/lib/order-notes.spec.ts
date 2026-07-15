import { describe, expect, it } from 'vitest';
import { addNote, type InternalNote, makeNote, removeNote } from './order-notes';

function note(id: string, body = 'A note'): InternalNote {
  return { id, author: 'Ada Okoro', body, at: '2026-07-15T00:00:00.000Z' };
}

describe('makeNote', () => {
  it('trims and stamps a note', () => {
    const n = makeNote('  hello  ', 'Ada', new Date('2026-07-15T10:00:00.000Z'));
    expect(n?.body).toBe('hello');
    expect(n?.author).toBe('Ada');
    expect(n?.at).toBe('2026-07-15T10:00:00.000Z');
    expect(n?.id).toBeTruthy();
  });

  it('returns null for an empty body', () => {
    expect(makeNote('   ', 'Ada')).toBeNull();
    expect(makeNote('', 'Ada')).toBeNull();
  });
});

describe('addNote', () => {
  it('prepends newest first', () => {
    let notes: InternalNote[] = [];
    notes = addNote(notes, note('a'));
    notes = addNote(notes, note('b'));
    expect(notes.map((n) => n.id)).toEqual(['b', 'a']);
  });
});

describe('removeNote', () => {
  it('removes by id', () => {
    const notes = [note('a'), note('b')];
    expect(removeNote(notes, 'a').map((n) => n.id)).toEqual(['b']);
  });
});
