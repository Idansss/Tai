import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiProvider } from './api';

const publishedArtwork = {
  id: 'a1',
  slug: 'market-day',
  status: 'PUBLISHED',
  publishedVersion: {
    id: 'v1',
    versionNumber: 1,
    status: 'PUBLISHED',
    title: 'Market Day',
    shortStory: 'Colour and noise at dawn.',
    story: 'A long story.',
    inspiration: 'Lagos, 6am.',
    metadata: {},
    publishedAt: '2026-01-01T00:00:00.000Z',
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  collections: [{ id: 'c1', slug: 'lagos', title: 'Lagos Mornings', description: null }],
  editions: [{ id: 'e1', name: 'Edition of 50' }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2026-01-01T00:00:00.000Z',
  archivedAt: null,
};

function stubJson(payload: unknown, status = 200) {
  const spy = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => payload,
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('apiProvider.listArtworks', () => {
  it('maps a published artwork onto the storefront summary', async () => {
    stubJson({
      data: { items: [publishedArtwork], nextCursor: null },
      meta: { correlationId: 'c1' },
    });
    const page = await apiProvider.listArtworks();
    expect(page.items[0]).toMatchObject({
      slug: 'market-day',
      title: 'Market Day',
      collection: 'Lagos Mornings',
      shortStory: 'Colour and noise at dawn.',
      limitedEdition: true,
    });
    expect(page.nextCursor).toBeNull();
  });

  it('never invents a price or an availability the contract does not carry (ADR-015)', async () => {
    stubJson({
      data: { items: [publishedArtwork], nextCursor: null },
      meta: { correlationId: 'c1' },
    });
    const page = await apiProvider.listArtworks();
    expect(page.items[0]?.startingPriceMinor).toBeNull();
    expect(page.items[0]?.currency).toBeNull();
    expect(page.items[0]?.availability).toBeNull();
  });

  it('does not forward filters the contract rejects (availability, sort=popular)', async () => {
    const spy = stubJson({
      data: { items: [], nextCursor: null },
      meta: { correlationId: 'c1' },
    });
    await apiProvider.listArtworks({ availability: 'available', sort: 'popular', limit: 4 });
    const url = String(spy.mock.calls[0]?.[0]);
    expect(url).toContain('limit=4');
    expect(url).not.toContain('availability');
    expect(url).not.toContain('sort');
  });

  it('treats an artwork with no published version as having no narrative rather than crashing', async () => {
    stubJson({
      data: {
        items: [{ ...publishedArtwork, publishedVersion: null, editions: [] }],
        nextCursor: null,
      },
      meta: { correlationId: 'c1' },
    });
    const page = await apiProvider.listArtworks();
    expect(page.items[0]).toMatchObject({
      title: 'market-day',
      shortStory: '',
      limitedEdition: false,
    });
  });
});

describe('apiProvider.getArtwork', () => {
  it('returns null for an unknown slug', async () => {
    stubJson({ error: { code: 'RESOURCE_NOT_FOUND', message: 'No.', correlationId: 'c1' } }, 404);
    await expect(apiProvider.getArtwork('nope')).resolves.toBeNull();
  });
});

describe('apiProvider.searchArtworks', () => {
  it('short-circuits an empty query without calling the API', async () => {
    const spy = stubJson({ data: { items: [], nextCursor: null }, meta: { correlationId: 'c1' } });
    await expect(apiProvider.searchArtworks('   ')).resolves.toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('domains with no backend', () => {
  it.each([
    ['listProducts', () => apiProvider.listProducts()],
    ['getStudioOptions', () => apiProvider.getStudioOptions()],
    ['getDeliveryOptions', () => apiProvider.getDeliveryOptions()],
    ['getLoyalty', () => apiProvider.getLoyalty('a@b.com')],
  ])('%s throws instead of silently returning mock data', (_name, call) => {
    expect(call).toThrow(/no backend to call/);
  });
});
