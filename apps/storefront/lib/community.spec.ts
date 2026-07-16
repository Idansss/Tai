import { describe, expect, it } from 'vitest';
import type { CommunityPhoto, ModerationStatus } from './data/types';
import {
  filterApproved,
  formatHandle,
  isPublic,
  moderationLabel,
  moderationTone,
  validatePhotoSubmission,
} from './community';

function photo(status: ModerationStatus, id: string = status): CommunityPhoto {
  return {
    id,
    artworkSlug: 'midnight-in-lagos',
    artworkTitle: 'Midnight in Lagos',
    handle: '@ada.wears',
    caption: 'Out in the city.',
    status,
    createdAt: '2026-06-01T00:00:00.000Z',
  };
}

describe('isPublic / filterApproved', () => {
  it('treats only approved photos as public', () => {
    expect(isPublic(photo('approved'))).toBe(true);
    expect(isPublic(photo('pending'))).toBe(false);
    expect(isPublic(photo('rejected'))).toBe(false);
  });

  it('filters out pending and rejected while preserving order', () => {
    const input = [
      photo('approved', 'a'),
      photo('pending', 'b'),
      photo('approved', 'c'),
      photo('rejected', 'd'),
    ];
    expect(filterApproved(input).map((p) => p.id)).toEqual(['a', 'c']);
  });
});

describe('moderationLabel / moderationTone', () => {
  it('labels each status', () => {
    expect(moderationLabel('approved')).toBe('Published');
    expect(moderationLabel('pending')).toBe('In review');
    expect(moderationLabel('rejected')).toBe('Not published');
  });

  it('tones each status', () => {
    expect(moderationTone('approved')).toBe('success');
    expect(moderationTone('pending')).toBe('warning');
    expect(moderationTone('rejected')).toBe('neutral');
  });
});

describe('formatHandle', () => {
  it('ensures a single leading @', () => {
    expect(formatHandle('ada.wears')).toBe('@ada.wears');
    expect(formatHandle('@ada.wears')).toBe('@ada.wears');
    expect(formatHandle('  @@ada  ')).toBe('@ada');
  });
});

describe('validatePhotoSubmission', () => {
  const valid = { handle: '@ada.wears', caption: 'Out in the city.', hasPhoto: true };

  it('accepts a complete submission', () => {
    expect(validatePhotoSubmission(valid)).toEqual({ ok: true });
  });

  it('requires a photo', () => {
    const result = validatePhotoSubmission({ ...valid, hasPhoto: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.hasPhoto).toBeTruthy();
  });

  it('rejects a bad handle and an empty or overlong caption', () => {
    const bad = validatePhotoSubmission({ handle: '!!', caption: '', hasPhoto: true });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.errors.handle).toBeTruthy();
      expect(bad.errors.caption).toBeTruthy();
    }
    const long = validatePhotoSubmission({
      handle: '@ada',
      caption: 'x'.repeat(200),
      hasPhoto: true,
    });
    expect(long.ok).toBe(false);
    if (!long.ok) expect(long.errors.caption).toBeTruthy();
  });
});
