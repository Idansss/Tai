import { describe, expect, it } from 'vitest';
import type { AdminArtworkSummary, ArtworkMockup } from './data/types';
import {
  applyArtworkAction,
  approvalTally,
  artworkActions,
  canPublish,
  filterArtworks,
  formatArtworkStatus,
  setMockupApproval,
  validateUpload,
} from './artworks';

function art(over: Partial<AdminArtworkSummary>): AdminArtworkSummary {
  return {
    id: 'a1',
    slug: 'midnight-in-lagos',
    title: 'Midnight in Lagos',
    collection: 'Night Studies',
    status: 'draft',
    versionCount: 1,
    mockupCount: 2,
    updatedAt: '2026-07-15T00:00:00.000Z',
    ...over,
  };
}

function mockup(id: string, approval: ArtworkMockup['approval']): ArtworkMockup {
  return { id, label: `Mockup ${id}`, view: 'front', approval };
}

describe('formatArtworkStatus', () => {
  it('renders readable labels', () => {
    expect(formatArtworkStatus('needs_review')).toBe('Needs review');
    expect(formatArtworkStatus('published')).toBe('Published');
  });
});

describe('filterArtworks', () => {
  const list = [
    art({ id: '1', title: 'Midnight in Lagos', status: 'published' }),
    art({ id: '2', title: 'Okada Run', collection: 'Street', status: 'draft' }),
    art({ id: '3', title: 'Harmattan Bloom', status: 'published' }),
  ];
  it('filters by status', () => {
    expect(filterArtworks(list, { status: 'published' }).map((a) => a.id)).toEqual(['1', '3']);
  });
  it('searches title and collection', () => {
    expect(filterArtworks(list, { query: 'okada' }).map((a) => a.id)).toEqual(['2']);
    expect(filterArtworks(list, { query: 'street' }).map((a) => a.id)).toEqual(['2']);
  });
});

describe('artworkActions + applyArtworkAction', () => {
  it('offers publish/schedule/archive from draft and ready', () => {
    expect(artworkActions('draft').map((a) => a.id)).toEqual(['publish', 'schedule', 'archive']);
    expect(artworkActions('ready').map((a) => a.id)).toEqual(['publish', 'schedule', 'archive']);
  });
  it('restricts processing/needs_review to archive', () => {
    expect(artworkActions('needs_review').map((a) => a.id)).toEqual(['archive']);
    expect(artworkActions('processing').map((a) => a.id)).toEqual(['archive']);
  });
  it('transitions correctly', () => {
    expect(applyArtworkAction('draft', 'publish')).toBe('published');
    expect(applyArtworkAction('ready', 'schedule')).toBe('scheduled');
    expect(applyArtworkAction('published', 'unpublish')).toBe('ready');
    expect(applyArtworkAction('scheduled', 'unschedule')).toBe('ready');
    expect(applyArtworkAction('archived', 'restore')).toBe('draft');
  });
  it('ignores invalid transitions', () => {
    // published can't be "published" again — publish isn't an allowed action there
    expect(applyArtworkAction('published', 'publish')).toBe('published');
    expect(applyArtworkAction('needs_review', 'publish')).toBe('needs_review');
  });
});

describe('mockup approval', () => {
  const mockups = [mockup('m1', 'pending'), mockup('m2', 'pending')];
  it('sets approval by id', () => {
    const next = setMockupApproval(mockups, 'm1', 'approved');
    expect(next.find((m) => m.id === 'm1')?.approval).toBe('approved');
    expect(next.find((m) => m.id === 'm2')?.approval).toBe('pending');
  });
  it('tallies approvals', () => {
    const t = approvalTally([
      mockup('a', 'approved'),
      mockup('b', 'rejected'),
      mockup('c', 'pending'),
    ]);
    expect(t).toEqual({ approved: 1, rejected: 1, pending: 1, total: 3 });
  });
  it('allows publish only when all approved', () => {
    expect(canPublish([mockup('a', 'approved'), mockup('b', 'approved')])).toBe(true);
    expect(canPublish([mockup('a', 'approved'), mockup('b', 'pending')])).toBe(false);
    expect(canPublish([])).toBe(false);
  });
});

describe('validateUpload', () => {
  it('accepts print-ready formats', () => {
    expect(validateUpload('lagos.png', 5 * 1024 * 1024).ok).toBe(true);
    expect(validateUpload('lagos.tif', 5 * 1024 * 1024).ok).toBe(true);
  });
  it('rejects unsupported formats and empty names', () => {
    expect(validateUpload('lagos.jpg', 1024).ok).toBe(false);
    expect(validateUpload('', 1024).ok).toBe(false);
  });
  it('rejects oversize files', () => {
    const res = validateUpload('big.png', 60 * 1024 * 1024);
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes('limit'))).toBe(true);
  });
  it('warns on small PNGs but still passes', () => {
    const res = validateUpload('small.png', 1 * 1024 * 1024);
    expect(res.ok).toBe(true);
    expect(res.warnings.length).toBe(1);
  });
});
