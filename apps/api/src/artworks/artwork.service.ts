import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type {
  AdminArtwork,
  Artwork,
  ArtworkCreateInput,
  ArtworkVersion,
  ArtworkVersionInput,
  CursorPage,
} from '@tms/contracts';
import { ArtworkStatus, ArtworkVersionStatus, Prisma } from '@tms/database';

import { ADMIN_AUTH_CONFIG } from '../admin-auth/admin-auth.tokens.js';
import type {
  AdminAuthenticatedSession,
  AdminRequestContext,
} from '../admin-auth/admin-auth.types.js';
import type { AdminAuthConfig } from '../admin-auth/admin-auth.types.js';
import { hashOpaqueValue } from '../auth/auth-crypto.js';
import { DatabaseService } from '../database/database.service.js';
import { ApiProblemException } from '../platform/api-problem.exception.js';

type VersionRecord = {
  id: string;
  versionNumber: number;
  status: ArtworkVersionStatus;
  title: string;
  shortStory: string | null;
  story: string | null;
  inspiration: string | null;
  metadata: Prisma.JsonValue;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
};

type ArtworkRecord = {
  id: string;
  slug: string;
  status: ArtworkStatus;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  archivedAt: Date | null;
  versions: VersionRecord[];
};

@Injectable()
export class ArtworkService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ADMIN_AUTH_CONFIG) private readonly adminAuthConfig: AdminAuthConfig,
  ) {}

  async createArtwork(
    actor: AdminAuthenticatedSession,
    input: ArtworkCreateInput,
    context: AdminRequestContext,
  ): Promise<AdminArtwork> {
    try {
      const artworkId = await this.database.client.$transaction(async (transaction) => {
        const artwork = await transaction.artwork.create({
          data: {
            slug: input.slug,
            createdByUserId: actor.session.user.id,
            versions: {
              create: {
                versionNumber: 1,
                title: input.title.trim(),
                shortStory: this.optionalText(input.shortStory),
                story: this.optionalText(input.story),
                inspiration: this.optionalText(input.inspiration),
                metadata: this.metadataInput(input.metadata),
                createdByUserId: actor.session.user.id,
              },
            },
          },
          select: { id: true },
        });
        await this.audit(transaction, actor, 'artwork.create', artwork.id, context, {
          slug: input.slug,
          versionNumber: 1,
        });
        return artwork.id;
      });
      return this.getAdminArtwork(artworkId);
    } catch (error) {
      if (this.isUniqueConflict(error)) throw this.conflict('That artwork slug is already in use.');
      throw error;
    }
  }

  async createVersion(
    actor: AdminAuthenticatedSession,
    artworkId: string,
    input: ArtworkVersionInput,
    context: AdminRequestContext,
  ): Promise<AdminArtwork> {
    try {
      await this.database.client.$transaction(async (transaction) => {
        await transaction.$queryRaw`SELECT id FROM artworks WHERE id = ${artworkId}::uuid FOR UPDATE`;
        const artwork = await transaction.artwork.findUnique({ where: { id: artworkId } });
        if (!artwork) throw this.notFound('Artwork not found.');
        const latest = await transaction.artworkVersion.aggregate({
          where: { artworkId },
          _max: { versionNumber: true },
        });
        const versionNumber = (latest._max.versionNumber ?? 0) + 1;
        const version = await transaction.artworkVersion.create({
          data: {
            artworkId,
            versionNumber,
            title: input.title.trim(),
            shortStory: this.optionalText(input.shortStory),
            story: this.optionalText(input.story),
            inspiration: this.optionalText(input.inspiration),
            metadata: this.metadataInput(input.metadata),
            createdByUserId: actor.session.user.id,
          },
          select: { id: true },
        });
        await this.audit(transaction, actor, 'artwork.version.create', version.id, context, {
          artworkId,
          versionNumber,
        });
      });
      return this.getAdminArtwork(artworkId);
    } catch (error) {
      if (error instanceof ApiProblemException) throw error;
      if (this.isUniqueConflict(error)) {
        throw this.conflict('The artwork changed concurrently. Retry with the latest version.');
      }
      throw error;
    }
  }

  async publishVersion(
    actor: AdminAuthenticatedSession,
    artworkId: string,
    versionId: string,
    context: AdminRequestContext,
  ): Promise<AdminArtwork> {
    await this.database.client.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM artworks WHERE id = ${artworkId}::uuid FOR UPDATE`;
      const artwork = await transaction.artwork.findUnique({ where: { id: artworkId } });
      if (!artwork) throw this.notFound('Artwork not found.');
      const version = await transaction.artworkVersion.findFirst({
        where: { id: versionId, artworkId },
      });
      if (!version) throw this.notFound('Artwork version not found.');
      if (version.status === ArtworkVersionStatus.PUBLISHED) return;

      const now = new Date();
      await transaction.artworkVersion.updateMany({
        where: { artworkId, status: ArtworkVersionStatus.PUBLISHED },
        data: { status: ArtworkVersionStatus.ARCHIVED, archivedAt: now },
      });
      await transaction.artworkVersion.update({
        where: { id: versionId },
        data: {
          status: ArtworkVersionStatus.PUBLISHED,
          publishedAt: now,
          archivedAt: null,
        },
      });
      await transaction.artwork.update({
        where: { id: artworkId },
        data: { status: ArtworkStatus.PUBLISHED, publishedAt: now, archivedAt: null },
      });
      await this.audit(transaction, actor, 'artwork.version.publish', versionId, context, {
        artworkId,
        versionNumber: version.versionNumber,
      });
    });
    return this.getAdminArtwork(artworkId);
  }

  async archiveVersion(
    actor: AdminAuthenticatedSession,
    artworkId: string,
    versionId: string,
    context: AdminRequestContext,
  ): Promise<AdminArtwork> {
    await this.database.client.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM artworks WHERE id = ${artworkId}::uuid FOR UPDATE`;
      const version = await transaction.artworkVersion.findFirst({
        where: { id: versionId, artworkId },
      });
      if (!version) throw this.notFound('Artwork version not found.');
      if (version.status === ArtworkVersionStatus.ARCHIVED) return;
      const now = new Date();
      await transaction.artworkVersion.update({
        where: { id: versionId },
        data: { status: ArtworkVersionStatus.ARCHIVED, archivedAt: now },
      });
      if (version.status === ArtworkVersionStatus.PUBLISHED) {
        await transaction.artwork.update({
          where: { id: artworkId },
          data: { status: ArtworkStatus.ARCHIVED, archivedAt: now },
        });
      }
      await this.audit(transaction, actor, 'artwork.version.archive', versionId, context, {
        artworkId,
        versionNumber: version.versionNumber,
      });
    });
    return this.getAdminArtwork(artworkId);
  }

  async archiveArtwork(
    actor: AdminAuthenticatedSession,
    artworkId: string,
    context: AdminRequestContext,
  ): Promise<AdminArtwork> {
    await this.database.client.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM artworks WHERE id = ${artworkId}::uuid FOR UPDATE`;
      const artwork = await transaction.artwork.findUnique({ where: { id: artworkId } });
      if (!artwork) throw this.notFound('Artwork not found.');
      if (artwork.status === ArtworkStatus.ARCHIVED) return;
      const now = new Date();
      await transaction.artworkVersion.updateMany({
        where: { artworkId, status: ArtworkVersionStatus.PUBLISHED },
        data: { status: ArtworkVersionStatus.ARCHIVED, archivedAt: now },
      });
      await transaction.artwork.update({
        where: { id: artworkId },
        data: { status: ArtworkStatus.ARCHIVED, archivedAt: now },
      });
      await this.audit(transaction, actor, 'artwork.archive', artworkId, context, {});
    });
    return this.getAdminArtwork(artworkId);
  }

  async listAdminArtworks(input: {
    cursor?: string;
    limit: number;
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  }): Promise<CursorPage<AdminArtwork>> {
    const records = await this.database.client.artwork.findMany({
      where: input.status ? { status: input.status } : undefined,
      include: { versions: { orderBy: { versionNumber: 'desc' } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      cursor: input.cursor ? { id: input.cursor } : undefined,
      skip: input.cursor ? 1 : undefined,
      take: input.limit + 1,
    });
    return this.page(records, input.limit, (record) => this.toAdminArtwork(record));
  }

  async getAdminArtwork(id: string): Promise<AdminArtwork> {
    const artwork = await this.database.client.artwork.findUnique({
      where: { id },
      include: { versions: { orderBy: { versionNumber: 'desc' } } },
    });
    if (!artwork) throw this.notFound('Artwork not found.');
    return this.toAdminArtwork(artwork);
  }

  async listPublishedArtworks(input: {
    cursor?: string;
    limit: number;
  }): Promise<CursorPage<Artwork>> {
    const records = await this.database.client.artwork.findMany({
      where: { status: ArtworkStatus.PUBLISHED },
      include: {
        versions: { where: { status: ArtworkVersionStatus.PUBLISHED }, take: 1 },
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      cursor: input.cursor ? { id: input.cursor } : undefined,
      skip: input.cursor ? 1 : undefined,
      take: input.limit + 1,
    });
    return this.page(records, input.limit, (record) => this.toArtwork(record));
  }

  async getPublishedArtwork(slug: string): Promise<Artwork> {
    const artwork = await this.database.client.artwork.findFirst({
      where: { slug, status: ArtworkStatus.PUBLISHED },
      include: {
        versions: { where: { status: ArtworkVersionStatus.PUBLISHED }, take: 1 },
      },
    });
    if (!artwork) throw this.notFound('Artwork not found.');
    return this.toArtwork(artwork);
  }

  private page<TRecord extends { id: string }, TOutput>(
    records: TRecord[],
    limit: number,
    map: (record: TRecord) => TOutput,
  ): CursorPage<TOutput> {
    const hasMore = records.length > limit;
    const visible = hasMore ? records.slice(0, limit) : records;
    return {
      items: visible.map(map),
      nextCursor: hasMore ? (visible.at(-1)?.id ?? null) : null,
    };
  }

  private toAdminArtwork(record: ArtworkRecord): AdminArtwork {
    return {
      ...this.toArtwork(record),
      versions: record.versions.map((item) => this.toVersion(item)),
    };
  }

  private toArtwork(record: ArtworkRecord): Artwork {
    const published = record.versions.find(
      (version) => version.status === ArtworkVersionStatus.PUBLISHED,
    );
    return {
      id: record.id,
      slug: record.slug,
      status: record.status,
      publishedVersion: published ? this.toVersion(published) : null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      publishedAt: record.publishedAt?.toISOString() ?? null,
      archivedAt: record.archivedAt?.toISOString() ?? null,
    };
  }

  private toVersion(record: VersionRecord): ArtworkVersion {
    return {
      id: record.id,
      versionNumber: record.versionNumber,
      status: record.status,
      title: record.title,
      shortStory: record.shortStory,
      story: record.story,
      inspiration: record.inspiration,
      metadata: record.metadata as Record<string, unknown>,
      publishedAt: record.publishedAt?.toISOString() ?? null,
      archivedAt: record.archivedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
    };
  }

  private metadataInput(metadata: Record<string, unknown> | undefined): Prisma.InputJsonValue {
    return (metadata ?? {}) as Prisma.InputJsonValue;
  }

  private optionalText(value: string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    return value.trim();
  }

  private async audit(
    transaction: Prisma.TransactionClient,
    actor: AdminAuthenticatedSession,
    action: string,
    resourceId: string,
    context: AdminRequestContext,
    metadata: Prisma.InputJsonObject,
  ): Promise<void> {
    await transaction.auditLog.create({
      data: {
        actorType: 'USER',
        actorUserId: actor.session.user.id,
        action,
        resourceType: 'artwork',
        resourceId,
        outcome: 'SUCCESS',
        correlationId: context.correlationId,
        ipAddressHash: context.ipAddress
          ? hashOpaqueValue(context.ipAddress, this.adminAuthConfig.tokenPepper)
          : null,
        metadata,
      },
    });
  }

  private isUniqueConflict(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private notFound(message: string): ApiProblemException {
    return new ApiProblemException('RESOURCE_NOT_FOUND', HttpStatus.NOT_FOUND, message);
  }

  private conflict(message: string): ApiProblemException {
    return new ApiProblemException('CONFLICT', HttpStatus.CONFLICT, message);
  }
}
