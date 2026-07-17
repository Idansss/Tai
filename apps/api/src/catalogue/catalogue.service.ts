import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ArtworkStatus, Prisma } from '@tms/database';

import type {
  AdminAuthenticatedSession,
  AdminRequestContext,
} from '../admin-auth/admin-auth.types.js';
import { DatabaseService } from '../database/database.service.js';
import { ApiProblemException } from '../platform/api-problem.exception.js';
import { deriveArtworkAvailability, deriveStartingPrice } from './artwork-read-model.js';
import type {
  AssociationDto,
  ArtworkCatalogueQueryDto,
  CatalogueEntryDto,
  CatalogueEntryUpdateDto,
  DropDto,
  DropUpdateDto,
  EditionDto,
  StoryDto,
  TagDto,
} from './catalogue.dto.js';

@Injectable()
export class CatalogueService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  listTags() {
    return this.database.client.tag.findMany({ orderBy: [{ kind: 'asc' }, { name: 'asc' }] });
  }
  async createTag(actor: AdminAuthenticatedSession, input: TagDto, context: AdminRequestContext) {
    return this.mutate(actor, 'catalogue.tag.create', 'tag', context, () =>
      this.database.client.tag.create({ data: input }),
    );
  }
  async updateTag(
    actor: AdminAuthenticatedSession,
    id: string,
    input: TagDto,
    context: AdminRequestContext,
  ) {
    return this.mutate(actor, 'catalogue.tag.update', id, context, () =>
      this.database.client.tag.update({ where: { id }, data: input }),
    );
  }
  async deleteTag(actor: AdminAuthenticatedSession, id: string, context: AdminRequestContext) {
    await this.mutate(actor, 'catalogue.tag.delete', id, context, () =>
      this.database.client.tag.delete({ where: { id } }),
    );
  }
  async linkTag(
    actor: AdminAuthenticatedSession,
    tagId: string,
    artworkId: string,
    context: AdminRequestContext,
  ) {
    return this.mutate(actor, 'catalogue.tag.link', tagId, context, () =>
      this.database.client.artworkTag.upsert({
        where: { artworkId_tagId: { artworkId, tagId } },
        update: {},
        create: { artworkId, tagId },
      }),
    );
  }
  async unlinkTag(
    actor: AdminAuthenticatedSession,
    tagId: string,
    artworkId: string,
    context: AdminRequestContext,
  ) {
    await this.mutate(actor, 'catalogue.tag.unlink', tagId, context, () =>
      this.database.client.artworkTag.delete({ where: { artworkId_tagId: { artworkId, tagId } } }),
    );
  }

  async listCollections(publicOnly = false, input?: { cursor?: string; limit: number }) {
    const records = await this.database.client.collection.findMany({
      where: publicOnly ? { status: ArtworkStatus.PUBLISHED } : undefined,
      include: {
        artworks: {
          where: publicOnly ? { artwork: { status: ArtworkStatus.PUBLISHED } } : undefined,
          orderBy: { position: 'asc' },
          select: { artworkId: true, position: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      cursor: input?.cursor ? { id: input.cursor } : undefined,
      skip: input?.cursor ? 1 : undefined,
      take: input ? input.limit + 1 : undefined,
    });
    return input ? this.page(records, input.limit) : records;
  }
  getCollection(slug: string, publicOnly = false) {
    return this.database.client.collection
      .findFirst({
        where: { slug, ...(publicOnly ? { status: ArtworkStatus.PUBLISHED } : {}) },
        include: {
          artworks: {
            where: publicOnly ? { artwork: { status: ArtworkStatus.PUBLISHED } } : undefined,
            orderBy: { position: 'asc' },
            select: { artworkId: true, position: true },
          },
        },
      })
      .then((value) => value ?? Promise.reject(this.notFound()));
  }
  async createCollection(
    actor: AdminAuthenticatedSession,
    input: CatalogueEntryDto,
    context: AdminRequestContext,
  ) {
    return this.mutate(actor, 'catalogue.collection.create', 'collection', context, () =>
      this.database.client.collection.create({
        data: { ...input, createdByUserId: actor.session.user.id },
      }),
    );
  }
  async updateCollection(
    actor: AdminAuthenticatedSession,
    id: string,
    input: CatalogueEntryUpdateDto,
    context: AdminRequestContext,
  ) {
    return this.mutate(actor, 'catalogue.collection.update', id, context, () =>
      this.database.client.collection.update({
        where: { id },
        data: { ...input, ...this.lifecycle(input.status) },
      }),
    );
  }
  async deleteCollection(
    actor: AdminAuthenticatedSession,
    id: string,
    context: AdminRequestContext,
  ) {
    await this.mutate(actor, 'catalogue.collection.delete', id, context, () =>
      this.database.client.collection.delete({ where: { id } }),
    );
  }
  async linkCollection(
    actor: AdminAuthenticatedSession,
    id: string,
    artworkId: string,
    input: AssociationDto,
    context: AdminRequestContext,
  ) {
    return this.mutate(actor, 'catalogue.collection.link', id, context, () =>
      this.database.client.collectionArtwork.upsert({
        where: { collectionId_artworkId: { collectionId: id, artworkId } },
        update: { position: input.position },
        create: { collectionId: id, artworkId, position: input.position },
      }),
    );
  }
  async unlinkCollection(
    actor: AdminAuthenticatedSession,
    id: string,
    artworkId: string,
    context: AdminRequestContext,
  ) {
    await this.mutate(actor, 'catalogue.collection.unlink', id, context, () =>
      this.database.client.collectionArtwork.delete({
        where: { collectionId_artworkId: { collectionId: id, artworkId } },
      }),
    );
  }

  async listDrops(publicOnly = false, input?: { cursor?: string; limit: number }) {
    const records = await this.database.client.drop.findMany({
      where: publicOnly ? { status: ArtworkStatus.PUBLISHED } : undefined,
      include: {
        artworks: {
          where: publicOnly ? { artwork: { status: ArtworkStatus.PUBLISHED } } : undefined,
          orderBy: { position: 'asc' },
          select: { artworkId: true, position: true },
        },
      },
      orderBy: { startsAt: 'desc' },
      cursor: input?.cursor ? { id: input.cursor } : undefined,
      skip: input?.cursor ? 1 : undefined,
      take: input ? input.limit + 1 : undefined,
    });
    return input ? this.page(records, input.limit) : records;
  }
  getDrop(slug: string, publicOnly = false) {
    return this.database.client.drop
      .findFirst({
        where: { slug, ...(publicOnly ? { status: ArtworkStatus.PUBLISHED } : {}) },
        include: {
          artworks: {
            where: publicOnly ? { artwork: { status: ArtworkStatus.PUBLISHED } } : undefined,
            orderBy: { position: 'asc' },
            select: { artworkId: true, position: true },
          },
        },
      })
      .then((value) => value ?? Promise.reject(this.notFound()));
  }
  async createDrop(actor: AdminAuthenticatedSession, input: DropDto, context: AdminRequestContext) {
    this.validateDropWindow(input.startsAt, input.endsAt);
    return this.mutate(actor, 'catalogue.drop.create', 'drop', context, () =>
      this.database.client.drop.create({
        data: {
          ...input,
          startsAt: input.startsAt ? new Date(input.startsAt) : null,
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
          createdByUserId: actor.session.user.id,
        },
      }),
    );
  }
  async updateDrop(
    actor: AdminAuthenticatedSession,
    id: string,
    input: DropUpdateDto,
    context: AdminRequestContext,
  ) {
    const existing = await this.database.client.drop.findUnique({ where: { id } });
    if (!existing) throw this.notFound();
    this.validateDropWindow(
      input.startsAt === undefined ? (existing.startsAt?.toISOString() ?? null) : input.startsAt,
      input.endsAt === undefined ? (existing.endsAt?.toISOString() ?? null) : input.endsAt,
    );
    return this.mutate(actor, 'catalogue.drop.update', id, context, () =>
      this.database.client.drop.update({
        where: { id },
        data: {
          slug: input.slug,
          title: input.title,
          description: input.description,
          status: input.status,
          startsAt:
            input.startsAt === undefined
              ? undefined
              : input.startsAt
                ? new Date(input.startsAt)
                : null,
          endsAt:
            input.endsAt === undefined ? undefined : input.endsAt ? new Date(input.endsAt) : null,
          ...this.lifecycle(input.status),
        },
      }),
    );
  }
  async deleteDrop(actor: AdminAuthenticatedSession, id: string, context: AdminRequestContext) {
    await this.mutate(actor, 'catalogue.drop.delete', id, context, () =>
      this.database.client.drop.delete({ where: { id } }),
    );
  }
  async linkDrop(
    actor: AdminAuthenticatedSession,
    id: string,
    artworkId: string,
    input: AssociationDto,
    context: AdminRequestContext,
  ) {
    return this.mutate(actor, 'catalogue.drop.link', id, context, () =>
      this.database.client.dropArtwork.upsert({
        where: { dropId_artworkId: { dropId: id, artworkId } },
        update: { position: input.position },
        create: { dropId: id, artworkId, position: input.position },
      }),
    );
  }
  async unlinkDrop(
    actor: AdminAuthenticatedSession,
    id: string,
    artworkId: string,
    context: AdminRequestContext,
  ) {
    await this.mutate(actor, 'catalogue.drop.unlink', id, context, () =>
      this.database.client.dropArtwork.delete({
        where: { dropId_artworkId: { dropId: id, artworkId } },
      }),
    );
  }

  listEditions(publicOnly = false) {
    return this.database.client.edition.findMany({
      where: publicOnly ? { status: ArtworkStatus.PUBLISHED } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }
  async createEdition(
    actor: AdminAuthenticatedSession,
    artworkId: string,
    input: EditionDto,
    context: AdminRequestContext,
  ) {
    this.validateEdition(input);
    return this.mutate(actor, 'catalogue.edition.create', artworkId, context, () =>
      this.database.client.edition.create({
        data: { artworkId, ...input, releasedAt: input.status === 'PUBLISHED' ? new Date() : null },
      }),
    );
  }
  async updateEdition(
    actor: AdminAuthenticatedSession,
    id: string,
    input: EditionDto,
    context: AdminRequestContext,
  ) {
    this.validateEdition(input);
    return this.mutate(actor, 'catalogue.edition.update', id, context, () =>
      this.database.client.edition.update({
        where: { id },
        data: { ...input, releasedAt: input.status === 'PUBLISHED' ? new Date() : undefined },
      }),
    );
  }
  async deleteEdition(actor: AdminAuthenticatedSession, id: string, context: AdminRequestContext) {
    await this.mutate(actor, 'catalogue.edition.delete', id, context, () =>
      this.database.client.edition.delete({ where: { id } }),
    );
  }

  async listStories(publicOnly = false, input?: { cursor?: string; limit: number }) {
    const records = await this.database.client.story.findMany({
      where: publicOnly ? { status: ArtworkStatus.PUBLISHED } : undefined,
      include: { blocks: { orderBy: { position: 'asc' } } },
      orderBy: { publishedAt: 'desc' },
      cursor: input?.cursor ? { id: input.cursor } : undefined,
      skip: input?.cursor ? 1 : undefined,
      take: input ? input.limit + 1 : undefined,
    });
    return input ? this.page(records, input.limit) : records;
  }
  getStory(slug: string, publicOnly = false) {
    return this.database.client.story
      .findFirst({
        where: { slug, ...(publicOnly ? { status: ArtworkStatus.PUBLISHED } : {}) },
        include: { blocks: { orderBy: { position: 'asc' } } },
      })
      .then((value) => value ?? Promise.reject(this.notFound()));
  }
  async createStory(
    actor: AdminAuthenticatedSession,
    input: StoryDto,
    context: AdminRequestContext,
  ) {
    this.validateStory(input);
    return this.mutate(actor, 'catalogue.story.create', 'story', context, () =>
      this.database.client.story.create({
        data: {
          slug: input.slug,
          title: input.title,
          excerpt: input.excerpt,
          artworkId: input.artworkId,
          collectionId: input.collectionId,
          createdByUserId: actor.session.user.id,
          status: input.status,
          ...this.lifecycle(input.status),
          blocks: {
            create: input.blocks.map((block, position) => ({
              ...block,
              content: block.content as Prisma.InputJsonObject,
              position,
            })),
          },
        },
        include: { blocks: true },
      }),
    );
  }
  async updateStory(
    actor: AdminAuthenticatedSession,
    id: string,
    input: StoryDto,
    context: AdminRequestContext,
  ) {
    this.validateStory(input);
    return this.mutate(actor, 'catalogue.story.update', id, context, () =>
      this.database.client.$transaction(async (tx) => {
        await tx.storyBlock.deleteMany({ where: { storyId: id } });
        return tx.story.update({
          where: { id },
          data: {
            slug: input.slug,
            title: input.title,
            excerpt: input.excerpt,
            artworkId: input.artworkId,
            collectionId: input.collectionId,
            status: input.status,
            ...this.lifecycle(input.status),
            blocks: {
              create: input.blocks.map((block, position) => ({
                ...block,
                content: block.content as Prisma.InputJsonObject,
                position,
              })),
            },
          },
          include: { blocks: { orderBy: { position: 'asc' } } },
        });
      }),
    );
  }
  async deleteStory(actor: AdminAuthenticatedSession, id: string, context: AdminRequestContext) {
    await this.mutate(actor, 'catalogue.story.delete', id, context, () =>
      this.database.client.story.delete({ where: { id } }),
    );
  }

  async searchArtworks(input: ArtworkCatalogueQueryDto) {
    const now = new Date();
    const tagConditions: Prisma.TagWhereInput[] = [];
    if (input.tag) tagConditions.push({ slug: input.tag });
    if (input.theme) tagConditions.push({ slug: input.theme, kind: 'THEME' });
    if (input.mood) tagConditions.push({ slug: input.mood, kind: 'MOOD' });
    if (input.colourFamily) tagConditions.push({ slug: input.colourFamily, kind: 'COLOUR_FAMILY' });
    const andConditions: Prisma.ArtworkWhereInput[] = tagConditions.map((condition) => ({
      tags: { some: { tag: condition } },
    }));
    if (input.availability) {
      andConditions.push(this.availabilityWhere(input.availability, now));
    }
    const records = await this.database.client.artwork.findMany({
      where: {
        status: ArtworkStatus.PUBLISHED,
        versions: input.q
          ? {
              some: {
                status: ArtworkStatus.PUBLISHED,
                OR: [
                  { title: { contains: input.q, mode: 'insensitive' } },
                  { shortStory: { contains: input.q, mode: 'insensitive' } },
                  { story: { contains: input.q, mode: 'insensitive' } },
                  { inspiration: { contains: input.q, mode: 'insensitive' } },
                ],
              },
            }
          : undefined,
        collections: input.collection
          ? { some: { collection: { slug: input.collection, status: ArtworkStatus.PUBLISHED } } }
          : undefined,
        drops: input.drop
          ? { some: { drop: { slug: input.drop, status: ArtworkStatus.PUBLISHED } } }
          : undefined,
        AND: andConditions,
        editions: input.limitedEdition ? { some: { status: ArtworkStatus.PUBLISHED } } : undefined,
      },
      include: {
        versions: {
          where: { status: ArtworkStatus.PUBLISHED },
          take: 1,
          include: {
            garmentCompatibilities: {
              where: { status: 'APPROVED' },
              select: { unitPriceMinor: true, currency: true },
            },
          },
        },
        tags: { include: { tag: true } },
        collections: {
          where: { collection: { status: ArtworkStatus.PUBLISHED } },
          include: { collection: true },
        },
        drops: {
          where: { drop: { status: ArtworkStatus.PUBLISHED } },
          include: { drop: true },
        },
        editions: { where: { status: ArtworkStatus.PUBLISHED } },
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      cursor: input.cursor ? { id: input.cursor } : undefined,
      skip: input.cursor ? 1 : undefined,
      take: input.limit + 1,
    });
    const visible = records.slice(0, input.limit);
    return {
      items: visible.map((record) => {
        const version = record.versions[0];
        return {
          id: record.id,
          slug: record.slug,
          status: record.status,
          startingPrice: deriveStartingPrice(version?.garmentCompatibilities ?? []),
          availability: deriveArtworkAvailability(
            record.drops.map(({ drop }) => ({ startsAt: drop.startsAt, endsAt: drop.endsAt })),
            now,
          ),
          publishedVersion: version
            ? {
                id: version.id,
                versionNumber: version.versionNumber,
                status: version.status,
                title: version.title,
                shortStory: version.shortStory,
                story: version.story,
                inspiration: version.inspiration,
                metadata: version.metadata as Record<string, unknown>,
                publishedAt: version.publishedAt?.toISOString() ?? null,
                archivedAt: version.archivedAt?.toISOString() ?? null,
                createdAt: version.createdAt.toISOString(),
              }
            : null,
          tags: record.tags.map(({ tag }) => tag),
          collections: record.collections.map(({ collection }) => ({
            id: collection.id,
            slug: collection.slug,
            title: collection.title,
            description: collection.description,
            status: collection.status,
            publishedAt: collection.publishedAt?.toISOString() ?? null,
            archivedAt: collection.archivedAt?.toISOString() ?? null,
          })),
          drops: record.drops.map(({ drop }) => ({
            id: drop.id,
            slug: drop.slug,
            title: drop.title,
            description: drop.description,
            status: drop.status,
            publishedAt: drop.publishedAt?.toISOString() ?? null,
            archivedAt: drop.archivedAt?.toISOString() ?? null,
          })),
          editions: record.editions.map((edition) => ({
            id: edition.id,
            artworkId: edition.artworkId,
            name: edition.name,
            totalQuantity: edition.totalQuantity,
            numbered: edition.numbered,
            status: edition.status,
            releasedAt: edition.releasedAt?.toISOString() ?? null,
          })),
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
          publishedAt: record.publishedAt?.toISOString() ?? null,
          archivedAt: record.archivedAt?.toISOString() ?? null,
        };
      }),
      nextCursor: records.length > input.limit ? (visible.at(-1)?.id ?? null) : null,
    };
  }

  /**
   * A WHERE fragment that selects artworks whose derived availability equals `state`. It must stay
   * in exact agreement with `deriveArtworkAvailability` so a card's badge and the filter never
   * disagree. Availability is drop-window derived only (TMS-FBR-012).
   */
  private availabilityWhere(
    state: 'AVAILABLE' | 'DROP_NOT_OPEN' | 'DROP_ENDED',
    now: Date,
  ): Prisma.ArtworkWhereInput {
    const publishedDrop = { drop: { status: ArtworkStatus.PUBLISHED } };
    const anyDrop: Prisma.ArtworkWhereInput = { drops: { some: publishedDrop } };
    const openDrop: Prisma.ArtworkWhereInput = {
      drops: {
        some: {
          drop: {
            status: ArtworkStatus.PUBLISHED,
            AND: [
              { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
              { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
            ],
          },
        },
      },
    };
    const upcomingDrop: Prisma.ArtworkWhereInput = {
      drops: { some: { drop: { status: ArtworkStatus.PUBLISHED, startsAt: { gt: now } } } },
    };
    if (state === 'AVAILABLE') return { OR: [{ NOT: anyDrop }, openDrop] };
    if (state === 'DROP_NOT_OPEN') return { AND: [anyDrop, { NOT: openDrop }, upcomingDrop] };
    return { AND: [anyDrop, { NOT: openDrop }, { NOT: upcomingDrop }] };
  }

  private lifecycle(status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') {
    const now = new Date();
    return status === 'PUBLISHED'
      ? { publishedAt: now, archivedAt: null }
      : status === 'ARCHIVED'
        ? { archivedAt: now }
        : status === 'DRAFT'
          ? { publishedAt: null, archivedAt: null }
          : {};
  }
  private validateDropWindow(startsAt?: string | null, endsAt?: string | null) {
    if (endsAt && (!startsAt || new Date(endsAt) <= new Date(startsAt)))
      throw this.validation('A drop end time must be after its start time.');
  }
  private validateEdition(input: EditionDto) {
    if (input.numbered && !input.totalQuantity)
      throw this.validation('A numbered edition requires a total quantity.');
  }
  private validateStory(input: StoryDto) {
    if (input.artworkId && input.collectionId)
      throw this.validation('A story can belong to an artwork or a collection, not both.');
  }
  private page<T extends { id: string }>(records: T[], limit: number) {
    const items = records.slice(0, limit);
    return { items, nextCursor: records.length > limit ? (items.at(-1)?.id ?? null) : null };
  }
  private async mutate<T>(
    actor: AdminAuthenticatedSession,
    action: string,
    resourceId: string,
    context: AdminRequestContext,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      const result = await operation();
      await this.database.client.auditLog.create({
        data: {
          actorType: 'USER',
          actorUserId: actor.session.user.id,
          action,
          resourceType: 'catalogue',
          resourceId,
          outcome: 'SUCCESS',
          correlationId: context.correlationId,
        },
      });
      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
        throw this.notFound();
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2002', 'P2003'].includes(error.code)
      )
        throw new ApiProblemException(
          'CONFLICT',
          HttpStatus.CONFLICT,
          'The catalogue change conflicts with existing data.',
        );
      throw error;
    }
  }
  private notFound() {
    return new ApiProblemException(
      'RESOURCE_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      'Catalogue resource not found.',
    );
  }
  private validation(message: string) {
    return new ApiProblemException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST, message);
  }
}
