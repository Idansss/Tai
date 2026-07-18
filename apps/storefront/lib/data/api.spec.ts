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
    ['getDeliveryOptions', () => apiProvider.getDeliveryOptions()],
    ['getLoyalty', () => apiProvider.getLoyalty('a@b.com')],
  ])('%s throws instead of silently returning mock data', (_name, call) => {
    expect(call).toThrow(/no backend to call/);
  });
});

/** One approved artwork+garment pair, shaped like /artworks/{slug}/compatible-garments. */
function compatibility(status = 'APPROVED', view = 'FRONT') {
  const placement = {
    id: 'p1',
    templateId: 't1',
    slug: 'centre-chest',
    name: 'Centre chest',
    view,
    status: 'PUBLISHED',
    xPermille: 300,
    yPermille: 200,
    widthPermille: 400,
    heightPermille: 500,
    printWidthMm: 280,
    printHeightMm: 350,
    position: 0,
    scalePresets: [
      {
        id: 's1',
        placementId: 'p1',
        slug: 'medium',
        name: 'Medium',
        scalePercent: 50,
        position: 1,
        status: 'PUBLISHED',
      },
      {
        id: 's2',
        placementId: 'p1',
        slug: 'small',
        name: 'Small',
        scalePercent: 25,
        position: 0,
        status: 'PUBLISHED',
      },
    ],
  };
  return {
    id: 'c1',
    artworkVersionId: 'av1',
    templateId: 't1',
    status,
    placements: [{ placement }],
    approvedAt: '2026-01-01T00:00:00.000Z',
    archivedAt: null,
    template: {
      id: 't1',
      slug: 'classic-tshirt',
      title: 'Classic T-shirt',
      status: 'PUBLISHED',
      colours: [{ id: 'col1', slug: 'black', name: 'Black', hex: '#1a1a1a', status: 'PUBLISHED' }],
      sizes: [{ id: 'sz1', code: 'M', label: 'M', position: 0, status: 'PUBLISHED' }],
      variants: [{ id: 'v1', colourId: 'col1', sizeId: 'sz1', sku: 'X', status: 'PUBLISHED' }],
      placements: [placement],
    },
  };
}

describe('apiProvider.getStudioOptions', () => {
  it('maps an approved pair into a garment the picker can offer', async () => {
    stubJson({ data: [compatibility()], meta: { correlationId: 'c1' } });
    const { garments } = await apiProvider.getStudioOptions('market-day');
    expect(garments).toHaveLength(1);
    expect(garments[0]).toMatchObject({
      slug: 'classic-tshirt',
      title: 'Classic T-shirt',
      artworkVersionId: 'av1',
      sizes: ['M'],
    });
    expect(garments[0]?.variants).toEqual([{ id: 'v1', colour: 'Black', size: 'M' }]);
  });

  it('converts permille geometry to a centred percentage for the preview', async () => {
    stubJson({ data: [compatibility()], meta: { correlationId: 'c1' } });
    const { garments } = await apiProvider.getStudioOptions('market-day');
    // x = 300/10 + (400/10)/2 = 50; y = 200/10 + (500/10)/2 = 45
    expect(garments[0]?.placements[0]).toMatchObject({ id: 'p1', area: 'front', x: 50, y: 45 });
  });

  it('scopes scale presets to their placement and orders them by position', async () => {
    stubJson({ data: [compatibility()], meta: { correlationId: 'c1' } });
    const { garments } = await apiProvider.getStudioOptions('market-day');
    const presets = garments[0]?.placements[0]?.scalePresets ?? [];
    expect(presets.map((p) => p.slug)).toEqual(['small', 'medium']);
    // widthPct resolves against the placement's approved width (40%), not the garment.
    expect(presets.map((p) => p.widthPct)).toEqual([10, 20]);
  });

  it('drops a pair that is not approved, so an unapproved canvas never reaches the picker', async () => {
    stubJson({ data: [compatibility('DRAFT')], meta: { correlationId: 'c1' } });
    await expect(apiProvider.getStudioOptions('market-day')).resolves.toEqual({ garments: [] });
  });

  it('drops placements approved for a view the preview cannot draw', async () => {
    stubJson({ data: [compatibility('APPROVED', 'LEFT')], meta: { correlationId: 'c1' } });
    await expect(apiProvider.getStudioOptions('market-day')).resolves.toEqual({ garments: [] });
  });
});
