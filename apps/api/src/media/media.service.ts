import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { MediaAsset as MediaAssetContract } from '@tms/contracts';
import {
  ArtworkStatus,
  ArtworkVersionStatus,
  CompatibilityStatus,
  MediaApprovalStatus,
  MediaAssetKind,
  MediaProcessingStatus,
  Prisma,
  type DatabaseClient,
} from '@tms/database';
import {
  type MalwareScanner,
  MediaValidationError,
  type ObjectStorage,
  validateImage,
} from '@tms/media';

import type { AdminAuthenticatedSession } from '../admin-auth/admin-auth.types.js';
import { DatabaseService } from '../database/database.service.js';
import { ApiProblemException } from '../platform/api-problem.exception.js';
import type { MockupApprovalDto, MockupUploadDto } from './media.dto.js';
import {
  MEDIA_QUEUE,
  MEDIA_SCANNER,
  MEDIA_STORAGE,
  type MediaQueuePublisher,
} from './media.tokens.js';

type AssetRecord = Awaited<ReturnType<DatabaseClient['artworkAsset']['findUniqueOrThrow']>>;

@Injectable()
export class MediaService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(MEDIA_STORAGE) private readonly storage: ObjectStorage,
    @Inject(MEDIA_SCANNER) private readonly scanner: MalwareScanner,
    @Inject(MEDIA_QUEUE) private readonly queue: MediaQueuePublisher,
  ) {}

  async uploadOriginal(
    actor: AdminAuthenticatedSession,
    artworkId: string,
    versionId: string,
    file: Express.Multer.File | undefined,
  ): Promise<MediaAssetContract> {
    await this.assertVersion(artworkId, versionId);
    const image = await this.inspect(file);
    const storageKey = `artworks/${artworkId}/versions/${versionId}/original/${image.checksumSha256}.${image.extension}`;
    await this.storage.put({
      key: storageKey,
      body: image.bytes,
      contentType: image.mimeType,
      checksumSha256: image.checksumSha256,
    });
    let created: { asset: AssetRecord; jobId: string };
    try {
      created = await this.database.client.$transaction(async (transaction) => {
        const asset = await transaction.artworkAsset.create({
          data: {
            artworkVersionId: versionId,
            kind: MediaAssetKind.ORIGINAL,
            variantKey: 'original',
            storageKey,
            originalFilename: file!.originalname,
            mimeType: image.mimeType,
            extension: image.extension,
            byteSize: image.bytes.byteLength,
            width: image.width,
            height: image.height,
            hasAlpha: image.hasAlpha,
            checksumSha256: image.checksumSha256,
            dominantHex: image.dominantHex,
            lowResolution: image.lowResolution,
            processingStatus: MediaProcessingStatus.QUEUED,
            malwareScanStatus: 'CLEAN',
            approvalStatus: MediaApprovalStatus.NOT_REQUIRED,
            createdByUserId: actor.session.user.id,
          },
        });
        const job = await transaction.mediaProcessingJob.create({
          data: { originalAssetId: asset.id },
        });
        await this.audit(transaction, actor, 'media.original.ingest', asset.id, {
          artworkId,
          versionId,
        });
        return { asset, jobId: job.id };
      });
    } catch (error) {
      if (this.isUniqueConflict(error))
        throw this.problem(
          'CONFLICT',
          HttpStatus.CONFLICT,
          'This artwork version already has an original.',
        );
      throw error;
    }
    try {
      await this.queue.enqueue({
        originalAssetId: created.asset.id,
        processingJobId: created.jobId,
      });
    } catch {
      await this.markQueueFailure(created.asset.id, created.jobId);
      throw this.problem(
        'MEDIA_PROCESSING_FAILED',
        HttpStatus.SERVICE_UNAVAILABLE,
        'The original is safe, but derivative processing could not be queued. Retry the media job.',
      );
    }
    return this.toContract(created.asset, true);
  }

  async uploadMockup(
    actor: AdminAuthenticatedSession,
    artworkId: string,
    versionId: string,
    input: MockupUploadDto,
    file: Express.Multer.File | undefined,
  ): Promise<MediaAssetContract> {
    await this.assertVersion(artworkId, versionId);
    const compatibility = await this.database.client.artworkGarmentCompatibility.findFirst({
      where: {
        artworkVersionId: versionId,
        templateId: input.garmentTemplateId,
        status: CompatibilityStatus.APPROVED,
        placements: { some: { placementId: input.garmentPlacementId } },
      },
    });
    if (!compatibility)
      throw this.problem(
        'CONFIGURATION_NOT_APPROVED',
        HttpStatus.UNPROCESSABLE_ENTITY,
        'The mockup garment placement is not approved for this artwork version.',
      );
    const original = await this.database.client.artworkAsset.findFirst({
      where: {
        artworkVersionId: versionId,
        kind: MediaAssetKind.ORIGINAL,
        malwareScanStatus: 'CLEAN',
      },
    });
    if (!original)
      throw this.problem(
        'RESOURCE_NOT_FOUND',
        HttpStatus.NOT_FOUND,
        'An immutable artwork original is required before a mockup.',
      );
    const image = await this.inspect(file);
    const variantKey = `${input.garmentTemplateId}:${input.garmentPlacementId}`;
    const storageKey = `artworks/${artworkId}/versions/${versionId}/mockups/${variantKey}/${image.checksumSha256}.${image.extension}`;
    await this.storage.put({
      key: storageKey,
      body: image.bytes,
      contentType: image.mimeType,
      checksumSha256: image.checksumSha256,
    });
    try {
      const asset = await this.database.client.$transaction(async (transaction) => {
        const record = await transaction.artworkAsset.create({
          data: {
            artworkVersionId: versionId,
            sourceAssetId: original.id,
            garmentTemplateId: input.garmentTemplateId,
            garmentPlacementId: input.garmentPlacementId,
            kind: MediaAssetKind.MOCKUP,
            variantKey,
            storageKey,
            originalFilename: file!.originalname,
            mimeType: image.mimeType,
            extension: image.extension,
            byteSize: image.bytes.byteLength,
            width: image.width,
            height: image.height,
            hasAlpha: image.hasAlpha,
            checksumSha256: image.checksumSha256,
            dominantHex: image.dominantHex,
            lowResolution: image.lowResolution,
            processingStatus: MediaProcessingStatus.READY,
            malwareScanStatus: 'CLEAN',
            approvalStatus: MediaApprovalStatus.PENDING,
            createdByUserId: actor.session.user.id,
          },
        });
        await this.audit(transaction, actor, 'media.mockup.ingest', record.id, {
          artworkId,
          versionId,
          ...input,
        });
        return record;
      });
      return this.toContract(asset, true);
    } catch (error) {
      if (this.isUniqueConflict(error))
        throw this.problem(
          'CONFLICT',
          HttpStatus.CONFLICT,
          'A mockup already exists for this artwork version and placement.',
        );
      throw error;
    }
  }

  async decideMockup(
    actor: AdminAuthenticatedSession,
    assetId: string,
    input: MockupApprovalDto,
  ): Promise<MediaAssetContract> {
    const existing = await this.database.client.artworkAsset.findFirst({
      where: { id: assetId, kind: MediaAssetKind.MOCKUP },
    });
    if (!existing)
      throw this.problem('RESOURCE_NOT_FOUND', HttpStatus.NOT_FOUND, 'Mockup not found.');
    if (existing.processingStatus !== MediaProcessingStatus.READY)
      throw this.problem(
        'MEDIA_PROCESSING_FAILED',
        HttpStatus.CONFLICT,
        'Only a ready mockup can be approved.',
      );
    const asset = await this.database.client.$transaction(async (transaction) => {
      const record = await transaction.artworkAsset.update({
        where: { id: assetId },
        data: {
          approvalStatus: input.status,
          approvedByUserId: actor.session.user.id,
          approvedAt: new Date(),
          rejectionReason: input.status === 'REJECTED' ? input.reason!.trim() : null,
        },
      });
      await this.audit(transaction, actor, `media.mockup.${input.status.toLowerCase()}`, assetId, {
        reason: input.reason,
      });
      return record;
    });
    return this.toContract(asset, true);
  }

  async retry(actor: AdminAuthenticatedSession, assetId: string): Promise<MediaAssetContract> {
    const original = await this.database.client.artworkAsset.findFirst({
      where: { id: assetId, kind: MediaAssetKind.ORIGINAL },
      include: { processingJob: true },
    });
    if (!original?.processingJob)
      throw this.problem(
        'RESOURCE_NOT_FOUND',
        HttpStatus.NOT_FOUND,
        'Original media job not found.',
      );
    if (original.processingStatus !== MediaProcessingStatus.FAILED)
      throw this.problem(
        'CONFLICT',
        HttpStatus.CONFLICT,
        'Only failed media processing can be retried.',
      );
    await this.database.client.$transaction(async (transaction) => {
      await transaction.artworkAsset.update({
        where: { id: assetId },
        data: { processingStatus: 'QUEUED', failureCode: null, failureMessage: null },
      });
      await transaction.mediaProcessingJob.update({
        where: { id: original.processingJob!.id },
        data: {
          status: 'QUEUED',
          attempts: 0,
          failureCode: null,
          failureMessage: null,
          completedAt: null,
        },
      });
      await this.audit(transaction, actor, 'media.derivatives.retry', assetId, {});
    });
    try {
      await this.queue.enqueue({
        originalAssetId: assetId,
        processingJobId: original.processingJob.id,
      });
    } catch {
      await this.markQueueFailure(assetId, original.processingJob.id);
      throw this.problem(
        'MEDIA_PROCESSING_FAILED',
        HttpStatus.SERVICE_UNAVAILABLE,
        'Derivative processing could not be queued.',
      );
    }
    return this.toContract(
      await this.database.client.artworkAsset.findUniqueOrThrow({ where: { id: assetId } }),
      true,
    );
  }

  async listAdmin(artworkId: string, versionId: string): Promise<MediaAssetContract[]> {
    await this.assertVersion(artworkId, versionId);
    const assets = await this.database.client.artworkAsset.findMany({
      where: { artworkVersionId: versionId },
      orderBy: [{ kind: 'asc' }, { createdAt: 'asc' }],
    });
    return Promise.all(assets.map((asset) => this.toContract(asset, true)));
  }

  async listPublic(slug: string): Promise<MediaAssetContract[]> {
    const artwork = await this.database.client.artwork.findFirst({
      where: { slug, status: ArtworkStatus.PUBLISHED },
      include: {
        versions: {
          where: { status: ArtworkVersionStatus.PUBLISHED },
          take: 1,
          include: {
            mediaAssets: {
              where: {
                processingStatus: MediaProcessingStatus.READY,
                OR: [
                  { kind: { in: [MediaAssetKind.WEB_DERIVATIVE, MediaAssetKind.THUMBNAIL] } },
                  { kind: MediaAssetKind.MOCKUP, approvalStatus: MediaApprovalStatus.APPROVED },
                ],
              },
            },
          },
        },
      },
    });
    if (!artwork)
      throw this.problem('RESOURCE_NOT_FOUND', HttpStatus.NOT_FOUND, 'Artwork not found.');
    return Promise.all(
      (artwork.versions[0]?.mediaAssets ?? []).map((asset) => this.toContract(asset, true)),
    );
  }

  private async inspect(file: Express.Multer.File | undefined) {
    if (!file)
      throw this.problem(
        'MEDIA_VALIDATION_FAILED',
        HttpStatus.BAD_REQUEST,
        'One image file is required.',
      );
    let image;
    try {
      image = await validateImage({
        bytes: file.buffer,
        declaredMimeType: file.mimetype,
        filename: file.originalname,
      });
    } catch (error) {
      if (error instanceof MediaValidationError)
        throw this.problem(
          'MEDIA_VALIDATION_FAILED',
          HttpStatus.UNPROCESSABLE_ENTITY,
          error.message,
        );
      throw error;
    }
    const scan = await this.scanner.scan(image.bytes);
    if (scan.status === 'INFECTED')
      throw this.problem(
        'MEDIA_INFECTED',
        HttpStatus.UNPROCESSABLE_ENTITY,
        'The file failed malware scanning.',
      );
    if (scan.status === 'ERROR')
      throw this.problem(
        'INTEGRATION_UNAVAILABLE',
        HttpStatus.SERVICE_UNAVAILABLE,
        'Malware scanning is temporarily unavailable.',
      );
    return image;
  }

  private async assertVersion(artworkId: string, versionId: string): Promise<void> {
    const version = await this.database.client.artworkVersion.findFirst({
      where: { id: versionId, artworkId },
    });
    if (!version)
      throw this.problem('RESOURCE_NOT_FOUND', HttpStatus.NOT_FOUND, 'Artwork version not found.');
  }

  private async toContract(asset: AssetRecord, includeUrl: boolean): Promise<MediaAssetContract> {
    return {
      id: asset.id,
      artworkVersionId: asset.artworkVersionId,
      kind: asset.kind,
      variantKey: asset.variantKey,
      originalFilename: asset.originalFilename,
      mimeType: asset.mimeType,
      byteSize: asset.byteSize,
      width: asset.width,
      height: asset.height,
      hasAlpha: asset.hasAlpha,
      checksumSha256: asset.checksumSha256,
      dominantHex: asset.dominantHex,
      lowResolution: asset.lowResolution,
      processingStatus: asset.processingStatus,
      approvalStatus: asset.approvalStatus,
      failureCode: asset.failureCode,
      failureMessage: asset.failureMessage,
      rejectionReason: asset.rejectionReason,
      garmentTemplateId: asset.garmentTemplateId,
      garmentPlacementId: asset.garmentPlacementId,
      url: includeUrl ? await this.storage.signedGetUrl(asset.storageKey) : null,
      createdAt: asset.createdAt.toISOString(),
    };
  }

  private async markQueueFailure(assetId: string, jobId: string): Promise<void> {
    await this.database.client.$transaction([
      this.database.client.artworkAsset.update({
        where: { id: assetId },
        data: {
          processingStatus: 'FAILED',
          failureCode: 'QUEUE_UNAVAILABLE',
          failureMessage: 'Derivative processing could not be queued.',
        },
      }),
      this.database.client.mediaProcessingJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          failureCode: 'QUEUE_UNAVAILABLE',
          failureMessage: 'Derivative processing could not be queued.',
        },
      }),
    ]);
  }

  private audit(
    transaction: Prisma.TransactionClient,
    actor: AdminAuthenticatedSession,
    action: string,
    resourceId: string,
    metadata: Record<string, unknown>,
  ) {
    return transaction.auditLog.create({
      data: {
        actorType: 'USER',
        actorUserId: actor.session.user.id,
        action,
        resourceType: 'artwork_asset',
        resourceId,
        outcome: 'SUCCESS',
        correlationId: 'media-command',
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  private isUniqueConflict(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private problem(
    code: ConstructorParameters<typeof ApiProblemException>[0],
    status: number,
    message: string,
  ): ApiProblemException {
    return new ApiProblemException(code, status, message);
  }
}
