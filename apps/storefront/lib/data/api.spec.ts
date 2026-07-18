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

/**
 * Route a stubbed fetch by URL fragment so a mapper that makes more than one request (a drop plus
 * its /artworks lookup) sees the right body for each. The first matching fragment wins, so list
 * "/artworks" before "/drops".
 */
function stubByUrl(routes: Array<[fragment: string, payload: unknown]>, status = 200) {
  const spy = vi.fn().mockImplementation((url: unknown) => {
    const match = routes.find(([fragment]) => String(url).includes(fragment));
    return Promise.resolve({ ok: status < 400, status, json: async () => match?.[1] });
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

const publishedDrop = {
  id: 'd1',
  slug: 'harmattan-2026',
  title: 'Harmattan 2026',
  description: 'A dry-season release.',
  status: 'PUBLISHED',
  publishedAt: '2026-01-01T00:00:00.000Z',
  archivedAt: null,
  tagline: 'Dust and gold.',
  earlyAccessAt: '2026-01-01T00:00:00.000Z',
  startsAt: '2026-01-02T00:00:00.000Z',
  endsAt: null,
  soldOut: false,
  pieceCount: 3,
};

const artworkPage = { data: { items: [publishedArtwork], nextCursor: null }, meta: {} };

describe('apiProvider.listDrops', () => {
  it('maps a drop and takes its collection eyebrow from the first piece', async () => {
    stubByUrl([
      ['/artworks', artworkPage],
      ['/drops', { data: { items: [publishedDrop], nextCursor: null }, meta: {} }],
    ]);
    const drops = await apiProvider.listDrops();
    expect(drops[0]).toMatchObject({
      slug: 'harmattan-2026',
      tagline: 'Dust and gold.',
      collection: 'Lagos Mornings',
      releaseAt: '2026-01-02T00:00:00.000Z',
      // The server's count, not the length of the resolved array.
      pieceCount: 3,
      soldOut: false,
    });
  });
});

describe('apiProvider.getDrop', () => {
  it('joins the drop narrative and its pieces', async () => {
    stubByUrl([
      ['/artworks', artworkPage],
      ['/drops', { data: publishedDrop, meta: {} }],
    ]);
    const drop = await apiProvider.getDrop('harmattan-2026');
    expect(drop).toMatchObject({ slug: 'harmattan-2026', story: 'A dry-season release.' });
    expect(drop?.artworks).toHaveLength(1);
    expect(drop?.artworks[0]?.slug).toBe('market-day');
  });

  it('returns null for an unknown slug', async () => {
    stubJson({ error: { code: 'RESOURCE_NOT_FOUND', message: 'No.', correlationId: 'c1' } }, 404);
    await expect(apiProvider.getDrop('nope')).resolves.toBeNull();
  });
});

const publishedStory = {
  id: 's1',
  slug: 'making-of-market-day',
  title: 'The Making of Market Day',
  excerpt: 'How a standing-up sketch became a wall of pattern.',
  category: 'Process',
  status: 'PUBLISHED',
  artworkId: 'a1',
  collectionId: null,
  blocks: [
    { id: 'b1', position: 0, type: 'TEXT', content: { text: 'A paragraph.' } },
    {
      id: 'b2',
      position: 2,
      type: 'SHOPPABLE',
      content: { target: { kind: 'artwork', slug: 'market-day' }, label: 'Shop the print' },
    },
    { id: 'b3', position: 1, type: 'QUOTE', content: { text: 'A quote.' } },
    { id: 'b4', position: 3, type: 'IMAGE', content: {} },
  ],
  readMinutes: 4,
  shoppableCount: 1,
  publishedAt: '2026-06-20T00:00:00.000Z',
  archivedAt: null,
};

describe('apiProvider.listStories', () => {
  it('maps a story onto the summary with server-derived fields and a client cover', async () => {
    stubJson({ data: { items: [publishedStory], nextCursor: null }, meta: {} });
    const stories = await apiProvider.listStories();
    expect(stories[0]).toMatchObject({
      slug: 'making-of-market-day',
      category: 'Process',
      readMinutes: 4,
      shoppableCount: 1,
      publishedOn: '2026-06-20T00:00:00.000Z',
      // Derived client-side from the first artwork the story links to (TMS-FBR-019).
      coverImage: '/artworks/market-day.jpg',
    });
  });
});

describe('apiProvider.getStory', () => {
  it('orders blocks, renders SHOPPABLE as a link, and drops unrenderable blocks', async () => {
    stubJson({ data: publishedStory, meta: {} });
    const story = await apiProvider.getStory('making-of-market-day');
    // The excerpt doubles as the standfirst; the read model has no separate intro.
    expect(story?.intro).toBe('How a standing-up sketch became a wall of pattern.');
    // Sorted by position: TEXT(0), QUOTE(1), SHOPPABLE(2). IMAGE(3) has no renderable body.
    expect(story?.blocks).toEqual([
      { kind: 'paragraph', text: 'A paragraph.' },
      { kind: 'paragraph', text: 'A quote.' },
      { kind: 'shoppable', href: '/artworks/market-day', label: 'Shop the print' },
    ]);
  });

  it('returns null for an unknown slug', async () => {
    stubJson({ error: { code: 'RESOURCE_NOT_FOUND', message: 'No.', correlationId: 'c1' } }, 404);
    await expect(apiProvider.getStory('nope')).resolves.toBeNull();
  });
});
