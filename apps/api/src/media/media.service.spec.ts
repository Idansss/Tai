import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import type { MalwareScanner, ObjectStorage } from '@tms/media';

import type { AdminAuthenticatedSession } from '../admin-auth/admin-auth.types.js';
import type { DatabaseService } from '../database/database.service.js';
import { MediaService } from './media.service.js';
import type { MediaQueuePublisher } from './media.tokens.js';

const actor = {
  session: { user: { id: '11111111-1111-4111-8111-111111111111' } },
} as unknown as AdminAuthenticatedSession;

async function png(): Promise<Buffer> {
  return sharp({ create: { width: 800, height: 700, channels: 4, background: '#6611aa' } })
    .png()
    .toBuffer();
}

function asset(overrides: Record<string, unknown> = {}) {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    artworkVersionId: '33333333-3333-4333-8333-333333333333',
    sourceAssetId: null,
    garmentTemplateId: null,
    garmentPlacementId: null,
    kind: 'ORIGINAL',
    variantKey: 'original',
    storageKey: 'art/original.png',
    originalFilename: 'art.png',
    mimeType: 'image/png',
    extension: 'png',
    byteSize: 1000,
    width: 800,
    height: 700,
    hasAlpha: true,
    checksumSha256: 'a'.repeat(64),
    dominantHex: '#6611aa',
    lowResolution: true,
    processingStatus: 'QUEUED',
    malwareScanStatus: 'CLEAN',
    approvalStatus: 'NOT_REQUIRED',
    failureCode: null,
    failureMessage: null,
    rejectionReason: null,
    metadata: null,
    createdByUserId: actor.session.user.id,
    approvedByUserId: null,
    approvedAt: null,
    createdAt: new Date('2026-07-16T12:00:00Z'),
    updatedAt: new Date('2026-07-16T12:00:00Z'),
    ...overrides,
  };
}

function service(options: { scan?: 'CLEAN' | 'INFECTED'; enqueueError?: Error } = {}) {
  const record = asset();
  const transaction = {
    artworkAsset: {
      create: vi.fn().mockResolvedValue(record),
      update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(
          asset({
            kind: 'MOCKUP',
            processingStatus: 'READY',
            approvalStatus: data.approvalStatus,
            approvedByUserId: data.approvedByUserId,
            approvedAt: data.approvedAt,
            rejectionReason: data.rejectionReason,
          }),
        ),
      ),
    },
    mediaProcessingJob: {
      create: vi.fn().mockResolvedValue({ id: '44444444-4444-4444-8444-444444444444' }),
      update: vi.fn(),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  const client = {
    artworkVersion: { findFirst: vi.fn().mockResolvedValue({ id: record.artworkVersionId }) },
    artworkAsset: {
      update: vi.fn().mockResolvedValue(record),
      findUniqueOrThrow: vi.fn().mockResolvedValue(record),
      findFirst: vi
        .fn()
        .mockResolvedValue(
          asset({ kind: 'MOCKUP', processingStatus: 'READY', approvalStatus: 'PENDING' }),
        ),
    },
    mediaProcessingJob: { update: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(async (input: unknown) => {
      if (typeof input === 'function') return input(transaction);
      return Promise.all(input as Promise<unknown>[]);
    }),
  };
  const storage: ObjectStorage = {
    put: vi.fn(),
    get: vi.fn(),
    signedGetUrl: vi.fn().mockResolvedValue('https://media.example/signed'),
  };
  const scanner: MalwareScanner = {
    scan: vi
      .fn()
      .mockResolvedValue(
        options.scan === 'INFECTED' ? { status: 'INFECTED' } : { status: 'CLEAN' },
      ),
  };
  const queue: MediaQueuePublisher = {
    enqueue: options.enqueueError ? vi.fn().mockRejectedValue(options.enqueueError) : vi.fn(),
  };
  return {
    media: new MediaService({ client } as unknown as DatabaseService, storage, scanner, queue),
    client,
    storage,
    queue,
  };
}

describe('MediaService', () => {
  it('stores a validated exact-version original and persists its retryable job before enqueueing', async () => {
    const fixture = service();
    const result = await fixture.media.uploadOriginal(
      actor,
      '55555555-5555-4555-8555-555555555555',
      '33333333-3333-4333-8333-333333333333',
      {
        buffer: await png(),
        mimetype: 'image/png',
        originalname: 'art.png',
      } as Express.Multer.File,
    );
    expect(fixture.storage.put).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: 'image/png' }),
    );
    expect(fixture.queue.enqueue).toHaveBeenCalledWith({
      originalAssetId: result.id,
      processingJobId: '44444444-4444-4444-8444-444444444444',
    });
    expect(result.url).toBe('https://media.example/signed');
  }, 30_000);

  it('rejects MIME spoofing and malware before object storage', async () => {
    const spoofed = service();
    await expect(
      spoofed.media.uploadOriginal(actor, 'artwork', '33333333-3333-4333-8333-333333333333', {
        buffer: await png(),
        mimetype: 'image/jpeg',
        originalname: 'art.jpg',
      } as Express.Multer.File),
    ).rejects.toMatchObject({
      code: 'MEDIA_VALIDATION_FAILED',
      status: 422,
    });
    expect(spoofed.storage.put).not.toHaveBeenCalled();

    const infected = service({ scan: 'INFECTED' });
    await expect(
      infected.media.uploadOriginal(actor, 'artwork', '33333333-3333-4333-8333-333333333333', {
        buffer: await png(),
        mimetype: 'image/png',
        originalname: 'art.png',
      } as Express.Multer.File),
    ).rejects.toMatchObject({
      code: 'MEDIA_INFECTED',
      status: 422,
    });
    expect(infected.storage.put).not.toHaveBeenCalled();
  }, 30_000);

  it('persists a safe failed state when queue publication is unavailable', async () => {
    const fixture = service({ enqueueError: new Error('redis unavailable') });
    await expect(
      fixture.media.uploadOriginal(actor, 'artwork', '33333333-3333-4333-8333-333333333333', {
        buffer: await png(),
        mimetype: 'image/png',
        originalname: 'art.png',
      } as Express.Multer.File),
    ).rejects.toMatchObject({
      code: 'MEDIA_PROCESSING_FAILED',
      status: 503,
    });
    expect(fixture.client.artworkAsset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          processingStatus: 'FAILED',
          failureCode: 'QUEUE_UNAVAILABLE',
        }),
      }),
    );
  }, 30_000);

  it('keeps mockups private until an explicit administrator approval decision', async () => {
    const fixture = service();
    const result = await fixture.media.decideMockup(actor, '22222222-2222-4222-8222-222222222222', {
      status: 'APPROVED',
    });
    expect(result).toMatchObject({ kind: 'MOCKUP', approvalStatus: 'APPROVED' });
    expect(result.url).toBe('https://media.example/signed');
  });
});
