import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import type { ObjectStorage, StoredObject } from '@tms/media';

import { MediaDerivativeProcessor, type MediaProcessingRepository } from './media-processor.js';

describe('MediaDerivativeProcessor', () => {
  it('stores deterministic web derivatives and completes the persistent job', async () => {
    const original = await sharp({
      create: { width: 800, height: 700, channels: 4, background: '#11aa77' },
    })
      .png()
      .toBuffer();
    const stored: StoredObject[] = [];
    const storage: ObjectStorage = {
      get: vi.fn().mockResolvedValue(original),
      put: vi.fn(async (object) => {
        stored.push(object);
      }),
      signedGetUrl: vi.fn(),
    };
    const repository: MediaProcessingRepository = {
      start: vi.fn().mockResolvedValue({
        id: 'original',
        artworkVersionId: 'version',
        storageKey: 'original.png',
        originalFilename: 'original.png',
        createdByUserId: 'user',
      }),
      succeed: vi.fn(),
      fail: vi.fn(),
    };
    await new MediaDerivativeProcessor(repository, storage).process({
      originalAssetId: 'original',
      processingJobId: 'job',
    });
    expect(stored.map((entry) => entry.contentType)).toEqual(['image/webp', 'image/webp']);
    expect(repository.succeed).toHaveBeenCalledWith(
      expect.anything(),
      'job',
      expect.arrayContaining([
        expect.objectContaining({ kind: 'WEB_DERIVATIVE', width: 800 }),
        expect.objectContaining({ kind: 'THUMBNAIL', width: 400 }),
      ]),
    );
    expect(repository.fail).not.toHaveBeenCalled();
  }, 30_000);

  it('records a safe persistent failure and rethrows for BullMQ retry', async () => {
    const repository: MediaProcessingRepository = {
      start: vi.fn().mockResolvedValue({
        id: 'original',
        artworkVersionId: 'version',
        storageKey: 'missing',
        originalFilename: 'original.png',
        createdByUserId: 'user',
      }),
      succeed: vi.fn(),
      fail: vi.fn(),
    };
    const storage: ObjectStorage = {
      get: vi.fn().mockRejectedValue(new Error('storage unavailable')),
      put: vi.fn(),
      signedGetUrl: vi.fn(),
    };
    await expect(
      new MediaDerivativeProcessor(repository, storage).process({
        originalAssetId: 'original',
        processingJobId: 'job',
      }),
    ).rejects.toThrow('storage unavailable');
    expect(repository.fail).toHaveBeenCalledWith(
      'original',
      'job',
      'DERIVATIVE_PROCESSING_FAILED',
      'storage unavailable',
    );
  });
});
