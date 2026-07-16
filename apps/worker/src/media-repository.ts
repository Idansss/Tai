import type { DatabaseClient } from '@tms/database';

import type {
  DerivativeOutput,
  MediaProcessingRepository,
  OriginalForProcessing,
} from './media-processor.js';

export class PrismaMediaProcessingRepository implements MediaProcessingRepository {
  constructor(private readonly database: DatabaseClient) {}

  async start(originalAssetId: string, processingJobId: string): Promise<OriginalForProcessing> {
    return this.database.$transaction(async (transaction) => {
      const original = await transaction.artworkAsset.findUniqueOrThrow({
        where: { id: originalAssetId },
      });
      await transaction.mediaProcessingJob.update({
        where: { id: processingJobId },
        data: {
          status: 'PROCESSING',
          attempts: { increment: 1 },
          startedAt: new Date(),
          completedAt: null,
          failureCode: null,
          failureMessage: null,
        },
      });
      await transaction.artworkAsset.update({
        where: { id: originalAssetId },
        data: { processingStatus: 'PROCESSING', failureCode: null, failureMessage: null },
      });
      return {
        id: original.id,
        artworkVersionId: original.artworkVersionId,
        storageKey: original.storageKey,
        originalFilename: original.originalFilename,
        createdByUserId: original.createdByUserId,
      };
    });
  }

  async succeed(
    original: OriginalForProcessing,
    processingJobId: string,
    outputs: DerivativeOutput[],
  ): Promise<void> {
    await this.database.$transaction(async (transaction) => {
      for (const output of outputs) {
        await transaction.artworkAsset.upsert({
          where: {
            artworkVersionId_kind_variantKey: {
              artworkVersionId: original.artworkVersionId,
              kind: output.kind,
              variantKey: output.variantKey,
            },
          },
          update: { processingStatus: 'READY', failureCode: null, failureMessage: null },
          create: {
            artworkVersionId: original.artworkVersionId,
            sourceAssetId: original.id,
            kind: output.kind,
            variantKey: output.variantKey,
            storageKey: output.storageKey,
            originalFilename: `${original.originalFilename}.${output.variantKey}.webp`,
            mimeType: 'image/webp',
            extension: 'webp',
            byteSize: output.bytes.byteLength,
            width: output.width,
            height: output.height,
            checksumSha256: output.checksumSha256,
            processingStatus: 'READY',
            malwareScanStatus: 'CLEAN',
            approvalStatus: 'NOT_REQUIRED',
            createdByUserId: original.createdByUserId,
          },
        });
      }
      await transaction.artworkAsset.update({
        where: { id: original.id },
        data: { processingStatus: 'READY', failureCode: null, failureMessage: null },
      });
      await transaction.mediaProcessingJob.update({
        where: { id: processingJobId },
        data: {
          status: 'SUCCEEDED',
          completedAt: new Date(),
          failureCode: null,
          failureMessage: null,
        },
      });
    });
  }

  async fail(
    originalAssetId: string,
    processingJobId: string,
    code: string,
    message: string,
  ): Promise<void> {
    await this.database.$transaction([
      this.database.artworkAsset.update({
        where: { id: originalAssetId },
        data: { processingStatus: 'FAILED', failureCode: code, failureMessage: message },
      }),
      this.database.mediaProcessingJob.update({
        where: { id: processingJobId },
        data: { status: 'FAILED', failureCode: code, failureMessage: message },
      }),
    ]);
  }
}
