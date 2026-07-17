import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiNetworkError, ApiRequestError, apiFetch, apiFetchOrNull } from './http';

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const spy = vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: response.json ?? (async () => ({ data: null, meta: { correlationId: 'c1' } })),
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('apiFetch', () => {
  it('unwraps the data envelope', async () => {
    mockFetch({
      json: async () => ({ data: { slug: 'market-day' }, meta: { correlationId: 'c1' } }),
    });
    await expect(apiFetch('/api/v1/artworks/market-day')).resolves.toEqual({ slug: 'market-day' });
  });

  it('always sends cookies, so the guest cart and session survive', async () => {
    const spy = mockFetch({});
    await apiFetch('/api/v1/cart');
    expect(spy.mock.calls[0]?.[1]).toMatchObject({ credentials: 'include' });
  });

  it('serialises query parameters and skips undefined ones', async () => {
    const spy = mockFetch({});
    await apiFetch('/api/v1/artworks', { query: { limit: 5, collection: undefined } });
    const url = String(spy.mock.calls[0]?.[0]);
    expect(url).toContain('limit=5');
    expect(url).not.toContain('collection');
  });

  it('maps an error envelope onto ApiRequestError, preserving the code', async () => {
    mockFetch({
      ok: false,
      status: 422,
      json: async () => ({
        error: {
          code: 'PROMOTION_INVALID',
          message: 'That code is not valid.',
          correlationId: 'c9',
        },
      }),
    });
    await expect(apiFetch('/api/v1/cart/promotion', { method: 'POST' })).rejects.toMatchObject({
      name: 'ApiRequestError',
      code: 'PROMOTION_INVALID',
      status: 422,
      correlationId: 'c9',
    });
  });

  it('raises ApiNetworkError when the API is unreachable, so the UI can offer a retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(apiFetch('/api/v1/artworks')).rejects.toBeInstanceOf(ApiNetworkError);
  });

  it('returns undefined for 204 rather than trying to parse a body', async () => {
    mockFetch({
      status: 204,
      json: async () => {
        throw new Error('204 has no body');
      },
    });
    await expect(apiFetch('/api/v1/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });
});

describe('apiFetchOrNull', () => {
  it('turns 404 into null, because an unowned resource is a 404 not a 403', async () => {
    mockFetch({
      ok: false,
      status: 404,
      json: async () => ({
        error: { code: 'RESOURCE_NOT_FOUND', message: 'Not found.', correlationId: 'c2' },
      }),
    });
    await expect(apiFetchOrNull('/api/v1/designs/other-persons-design')).resolves.toBeNull();
  });

  it('still throws on a server error, so a broken API never looks like an empty page', async () => {
    mockFetch({
      ok: false,
      status: 500,
      json: async () => ({
        error: { code: 'INTERNAL_ERROR', message: 'Boom.', correlationId: 'c3' },
      }),
    });
    await expect(apiFetchOrNull('/api/v1/artworks/market-day')).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });
});
