import type { DesignConfigurationSummary } from '@tms/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { designShareUrl, getDesign, rotateDesignShare, saveDesign } from './designs-api';

const design = {
  id: 'd1',
  artworkId: 'art-1',
  artworkVersionId: 'av1',
  garmentTemplateId: 'tpl-1',
  garmentVariantId: 'var-1',
  placementId: 'pl-1',
  scalePresetId: 'sp-1',
  view: 'FRONT',
  configurationHash: 'abc',
  name: 'My tee',
  visibility: 'PRIVATE',
  shareToken: null,
  createdAt: '',
  updatedAt: '',
} as DesignConfigurationSummary;

function stub(status: number, payload: unknown) {
  const spy = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => payload,
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

const input = {
  artworkVersionId: 'av1',
  garmentVariantId: 'var-1',
  placementId: 'pl-1',
  scalePreset: 'medium',
  view: 'FRONT',
} as const;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('saveDesign', () => {
  it('reports 201 as a newly created design', async () => {
    stub(201, { data: design, meta: { correlationId: 'c1' } });
    await expect(saveDesign(input)).resolves.toEqual({ design, created: true });
  });

  it('treats 200 as success, because saving is idempotent', async () => {
    stub(200, { data: design, meta: { correlationId: 'c1' } });
    const result = await saveDesign(input);
    // The distinction is "you already had this", not a failure.
    expect(result).toEqual({ design, created: false });
  });

  it('sends no quantity: quantity is cart state, not part of a design (ADR-014)', async () => {
    const spy = stub(201, { data: design, meta: { correlationId: 'c1' } });
    await saveDesign(input);
    const body = JSON.parse(String(spy.mock.calls[0]?.[1]?.body));
    expect(body).not.toHaveProperty('quantity');
    expect(body).toEqual(input);
  });

  it('sends cookies so the design is saved against the session', async () => {
    const spy = stub(201, { data: design, meta: { correlationId: 'c1' } });
    await saveDesign(input);
    expect(spy.mock.calls[0]?.[1]).toMatchObject({ credentials: 'include' });
  });

  it('still surfaces a real failure', async () => {
    stub(422, {
      error: { code: 'CONFIGURATION_NOT_APPROVED', message: 'No.', correlationId: 'c1' },
    });
    await expect(saveDesign(input)).rejects.toMatchObject({
      code: 'CONFIGURATION_NOT_APPROVED',
      status: 422,
    });
  });
});

describe('getDesign', () => {
  it("returns null for someone else's design, since that is a 404 not a 403", async () => {
    stub(404, { error: { code: 'RESOURCE_NOT_FOUND', message: 'No.', correlationId: 'c1' } });
    await expect(getDesign('someone-elses')).resolves.toBeNull();
  });
});

describe('rotateDesignShare', () => {
  it('returns the design carrying the new token', async () => {
    stub(200, {
      data: { ...design, visibility: 'UNLISTED', shareToken: 'new-token' },
      meta: { correlationId: 'c1' },
    });
    await expect(rotateDesignShare('d1')).resolves.toMatchObject({ shareToken: 'new-token' });
  });
});

describe('designShareUrl', () => {
  it('builds a public URL from the share token', () => {
    expect(designShareUrl({ ...design, shareToken: 'tok' }, 'https://x.test')).toBe(
      'https://x.test/shared-designs/tok',
    );
  });

  it('is null while the design has no token to share', () => {
    expect(designShareUrl(design, 'https://x.test')).toBeNull();
  });
});
