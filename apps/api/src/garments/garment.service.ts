import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ArtworkStatus, ArtworkVersionStatus, CompatibilityStatus, Prisma } from '@tms/database';

import type {
  AdminAuthenticatedSession,
  AdminRequestContext,
} from '../admin-auth/admin-auth.types.js';
import { DatabaseService } from '../database/database.service.js';
import { ApiProblemException } from '../platform/api-problem.exception.js';
import type {
  GarmentColourDto,
  GarmentCompatibilityDto,
  GarmentConfigurationDto,
  GarmentListQueryDto,
  GarmentPlacementDto,
  GarmentScalePresetDto,
  GarmentSizeDto,
  GarmentTemplateDto,
  GarmentTemplateUpdateDto,
  GarmentVariantDto,
} from './garment.dto.js';

@Injectable()
export class GarmentService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async listTemplates(publicOnly = false, input?: GarmentListQueryDto) {
    const records = await this.database.client.garmentTemplate.findMany({
      where: {
        ...(publicOnly ? { status: ArtworkStatus.PUBLISHED } : {}),
        ...(input?.type ? { type: input.type } : {}),
      },
      include: this.templateInclude(publicOnly),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      cursor: input?.cursor ? { id: input.cursor } : undefined,
      skip: input?.cursor ? 1 : undefined,
      take: input ? input.limit + 1 : undefined,
    });
    return input ? this.page(records, input.limit) : records;
  }

  getTemplate(slug: string, publicOnly = false) {
    return this.database.client.garmentTemplate
      .findFirst({
        where: { slug, ...(publicOnly ? { status: ArtworkStatus.PUBLISHED } : {}) },
        include: this.templateInclude(publicOnly),
      })
      .then((value) => value ?? Promise.reject(this.notFound()));
  }

  getTemplateById(id: string) {
    return this.database.client.garmentTemplate
      .findUnique({ where: { id }, include: this.templateInclude(false) })
      .then((value) => value ?? Promise.reject(this.notFound()));
  }

  async listCompatibleTemplates(artworkSlug: string) {
    const version = await this.database.client.artworkVersion.findFirst({
      where: {
        status: ArtworkVersionStatus.PUBLISHED,
        artwork: { slug: artworkSlug, status: ArtworkStatus.PUBLISHED },
      },
      select: { id: true },
    });
    if (!version) throw this.notFound();
    return this.database.client.artworkGarmentCompatibility.findMany({
      where: {
        artworkVersionId: version.id,
        status: CompatibilityStatus.APPROVED,
        template: { status: ArtworkStatus.PUBLISHED },
      },
      include: {
        placements: {
          where: { placement: { status: ArtworkStatus.PUBLISHED } },
          include: {
            placement: {
              include: {
                scalePresets: {
                  where: { status: ArtworkStatus.PUBLISHED },
                  orderBy: { position: 'asc' },
                },
              },
            },
          },
        },
        template: { include: this.templateInclude(true) },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createTemplate(
    actor: AdminAuthenticatedSession,
    input: GarmentTemplateDto,
    context: AdminRequestContext,
  ) {
    return this.mutate(actor, 'garment.template.create', 'garment-template', context, () =>
      this.database.client.garmentTemplate.create({
        data: { ...input, createdByUserId: actor.session.user.id },
        include: this.templateInclude(false),
      }),
    );
  }

  async updateTemplate(
    actor: AdminAuthenticatedSession,
    id: string,
    input: GarmentTemplateUpdateDto,
    context: AdminRequestContext,
  ) {
    if (!Object.values(input).some((value) => value !== undefined))
      throw this.validation('At least one garment field is required.');
    if (input.status === ArtworkStatus.PUBLISHED) await this.ensureTemplateReady(id);
    return this.mutate(actor, 'garment.template.update', id, context, () =>
      this.database.client.$transaction(async (tx) => {
        await tx.garmentTemplate.update({
          where: { id },
          data: { ...input, ...this.lifecycle(input.status) },
        });
        if (input.status && input.status !== ArtworkStatus.PUBLISHED) {
          await tx.artworkGarmentCompatibility.updateMany({
            where: { templateId: id, status: CompatibilityStatus.APPROVED },
            data: { status: CompatibilityStatus.ARCHIVED, archivedAt: new Date() },
          });
        }
        return tx.garmentTemplate.findUniqueOrThrow({
          where: { id },
          include: this.templateInclude(false),
        });
      }),
    );
  }

  async deleteTemplate(actor: AdminAuthenticatedSession, id: string, context: AdminRequestContext) {
    await this.ensureTemplateStructuralMutationAllowed(id);
    await this.mutate(actor, 'garment.template.delete', id, context, () =>
      this.database.client.garmentTemplate.delete({ where: { id } }),
    );
  }

  async createColour(
    actor: AdminAuthenticatedSession,
    templateId: string,
    input: GarmentColourDto,
    context: AdminRequestContext,
  ) {
    await this.ensureTemplateStructuralMutationAllowed(templateId);
    return this.mutate(actor, 'garment.colour.create', templateId, context, () =>
      this.database.client.garmentColour.create({ data: { templateId, ...input } }),
    );
  }

  async updateColour(
    actor: AdminAuthenticatedSession,
    id: string,
    input: GarmentColourDto,
    context: AdminRequestContext,
  ) {
    const colour = await this.database.client.garmentColour.findUnique({
      where: { id },
      select: { templateId: true },
    });
    if (!colour) throw this.notFound();
    await this.ensureTemplateStructuralMutationAllowed(colour.templateId);
    return this.mutate(actor, 'garment.colour.update', id, context, () =>
      this.database.client.garmentColour.update({ where: { id }, data: input }),
    );
  }

  async deleteColour(actor: AdminAuthenticatedSession, id: string, context: AdminRequestContext) {
    const colour = await this.database.client.garmentColour.findUnique({
      where: { id },
      select: { templateId: true },
    });
    if (!colour) throw this.notFound();
    await this.ensureTemplateStructuralMutationAllowed(colour.templateId);
    await this.mutate(actor, 'garment.colour.delete', id, context, () =>
      this.database.client.garmentColour.delete({ where: { id } }),
    );
  }

  async createSize(
    actor: AdminAuthenticatedSession,
    templateId: string,
    input: GarmentSizeDto,
    context: AdminRequestContext,
  ) {
    await this.ensureTemplateStructuralMutationAllowed(templateId);
    return this.mutate(actor, 'garment.size.create', templateId, context, () =>
      this.database.client.garmentSize.create({
        data: {
          templateId,
          code: input.code,
          label: input.label,
          position: input.position,
          status: input.status,
          measurements: { create: input.measurements },
        },
        include: { measurements: true },
      }),
    );
  }

  async updateSize(
    actor: AdminAuthenticatedSession,
    id: string,
    input: GarmentSizeDto,
    context: AdminRequestContext,
  ) {
    const size = await this.database.client.garmentSize.findUnique({
      where: { id },
      select: { templateId: true },
    });
    if (!size) throw this.notFound();
    await this.ensureTemplateStructuralMutationAllowed(size.templateId);
    return this.mutate(actor, 'garment.size.update', id, context, () =>
      this.database.client.$transaction(async (tx) => {
        await tx.garmentSizeMeasurement.deleteMany({ where: { sizeId: id } });
        return tx.garmentSize.update({
          where: { id },
          data: {
            code: input.code,
            label: input.label,
            position: input.position,
            status: input.status,
            measurements: { create: input.measurements },
          },
          include: { measurements: true },
        });
      }),
    );
  }

  async deleteSize(actor: AdminAuthenticatedSession, id: string, context: AdminRequestContext) {
    const size = await this.database.client.garmentSize.findUnique({
      where: { id },
      select: { templateId: true },
    });
    if (!size) throw this.notFound();
    await this.ensureTemplateStructuralMutationAllowed(size.templateId);
    await this.mutate(actor, 'garment.size.delete', id, context, () =>
      this.database.client.garmentSize.delete({ where: { id } }),
    );
  }

  async createVariant(
    actor: AdminAuthenticatedSession,
    templateId: string,
    input: GarmentVariantDto,
    context: AdminRequestContext,
  ) {
    await this.ensureTemplateStructuralMutationAllowed(templateId);
    await this.validateVariantMembers(templateId, input);
    return this.mutate(actor, 'garment.variant.create', templateId, context, () =>
      this.database.client.garmentVariant.create({ data: { templateId, ...input } }),
    );
  }

  async updateVariant(
    actor: AdminAuthenticatedSession,
    id: string,
    input: GarmentVariantDto,
    context: AdminRequestContext,
  ) {
    const variant = await this.database.client.garmentVariant.findUnique({ where: { id } });
    if (!variant) throw this.notFound();
    await this.ensureTemplateStructuralMutationAllowed(variant.templateId);
    await this.validateVariantMembers(variant.templateId, input);
    return this.mutate(actor, 'garment.variant.update', id, context, () =>
      this.database.client.garmentVariant.update({ where: { id }, data: input }),
    );
  }

  async deleteVariant(actor: AdminAuthenticatedSession, id: string, context: AdminRequestContext) {
    const variant = await this.database.client.garmentVariant.findUnique({ where: { id } });
    if (!variant) throw this.notFound();
    await this.ensureTemplateStructuralMutationAllowed(variant.templateId);
    await this.mutate(actor, 'garment.variant.delete', id, context, () =>
      this.database.client.garmentVariant.delete({ where: { id } }),
    );
  }

  async createPlacement(
    actor: AdminAuthenticatedSession,
    templateId: string,
    input: GarmentPlacementDto,
    context: AdminRequestContext,
  ) {
    await this.ensureTemplateStructuralMutationAllowed(templateId);
    this.validateGeometry(input);
    return this.mutate(actor, 'garment.placement.create', templateId, context, () =>
      this.database.client.garmentPlacement.create({ data: { templateId, ...input } }),
    );
  }

  async updatePlacement(
    actor: AdminAuthenticatedSession,
    id: string,
    input: GarmentPlacementDto,
    context: AdminRequestContext,
  ) {
    const placement = await this.database.client.garmentPlacement.findUnique({
      where: { id },
      select: { templateId: true },
    });
    if (!placement) throw this.notFound();
    await this.ensureTemplateStructuralMutationAllowed(placement.templateId);
    this.validateGeometry(input);
    if (input.status === ArtworkStatus.PUBLISHED) {
      const presets = await this.database.client.garmentScalePreset.count({
        where: { placementId: id, status: ArtworkStatus.PUBLISHED },
      });
      if (!presets) throw this.validation('A published placement needs a published scale preset.');
    }
    return this.mutate(actor, 'garment.placement.update', id, context, () =>
      this.database.client.garmentPlacement.update({ where: { id }, data: input }),
    );
  }

  async deletePlacement(
    actor: AdminAuthenticatedSession,
    id: string,
    context: AdminRequestContext,
  ) {
    const placement = await this.database.client.garmentPlacement.findUnique({
      where: { id },
      select: { templateId: true },
    });
    if (!placement) throw this.notFound();
    await this.ensureTemplateStructuralMutationAllowed(placement.templateId);
    await this.mutate(actor, 'garment.placement.delete', id, context, () =>
      this.database.client.garmentPlacement.delete({ where: { id } }),
    );
  }

  async createScalePreset(
    actor: AdminAuthenticatedSession,
    placementId: string,
    input: GarmentScalePresetDto,
    context: AdminRequestContext,
  ) {
    const placement = await this.database.client.garmentPlacement.findUnique({
      where: { id: placementId },
      select: { templateId: true },
    });
    if (!placement) throw this.notFound();
    await this.ensureTemplateStructuralMutationAllowed(placement.templateId);
    return this.mutate(actor, 'garment.scale-preset.create', placementId, context, () =>
      this.database.client.garmentScalePreset.create({ data: { placementId, ...input } }),
    );
  }

  async updateScalePreset(
    actor: AdminAuthenticatedSession,
    id: string,
    input: GarmentScalePresetDto,
    context: AdminRequestContext,
  ) {
    const preset = await this.database.client.garmentScalePreset.findUnique({
      where: { id },
      select: { placement: { select: { templateId: true } } },
    });
    if (!preset) throw this.notFound();
    await this.ensureTemplateStructuralMutationAllowed(preset.placement.templateId);
    return this.mutate(actor, 'garment.scale-preset.update', id, context, () =>
      this.database.client.garmentScalePreset.update({ where: { id }, data: input }),
    );
  }

  async deleteScalePreset(
    actor: AdminAuthenticatedSession,
    id: string,
    context: AdminRequestContext,
  ) {
    const preset = await this.database.client.garmentScalePreset.findUnique({
      where: { id },
      select: { placement: { select: { templateId: true } } },
    });
    if (!preset) throw this.notFound();
    await this.ensureTemplateStructuralMutationAllowed(preset.placement.templateId);
    await this.mutate(actor, 'garment.scale-preset.delete', id, context, () =>
      this.database.client.garmentScalePreset.delete({ where: { id } }),
    );
  }

  async setCompatibility(
    actor: AdminAuthenticatedSession,
    templateId: string,
    artworkVersionId: string,
    input: GarmentCompatibilityDto,
    context: AdminRequestContext,
  ) {
    if (input.status === CompatibilityStatus.APPROVED) {
      await this.validateCompatibilityApproval(templateId, artworkVersionId, input.placementIds);
    } else {
      await this.validatePlacementMembership(templateId, input.placementIds, false);
    }
    return this.mutate(
      actor,
      'garment.compatibility.set',
      `${templateId}:${artworkVersionId}`,
      context,
      () =>
        this.database.client.$transaction(async (tx) => {
          const compatibility = await tx.artworkGarmentCompatibility.upsert({
            where: {
              artworkVersionId_templateId: { artworkVersionId, templateId },
            },
            update: {
              status: input.status,
              approvedByUserId:
                input.status === CompatibilityStatus.APPROVED ? actor.session.user.id : null,
              approvedAt: input.status === CompatibilityStatus.APPROVED ? new Date() : null,
              archivedAt: input.status === CompatibilityStatus.ARCHIVED ? new Date() : null,
            },
            create: {
              artworkVersionId,
              templateId,
              status: input.status,
              createdByUserId: actor.session.user.id,
              approvedByUserId:
                input.status === CompatibilityStatus.APPROVED ? actor.session.user.id : null,
              approvedAt: input.status === CompatibilityStatus.APPROVED ? new Date() : null,
              archivedAt: input.status === CompatibilityStatus.ARCHIVED ? new Date() : null,
            },
          });
          await tx.artworkGarmentPlacement.deleteMany({
            where: { compatibilityId: compatibility.id },
          });
          if (input.placementIds.length) {
            await tx.artworkGarmentPlacement.createMany({
              data: input.placementIds.map((placementId) => ({
                compatibilityId: compatibility.id,
                placementId,
              })),
            });
          }
          return tx.artworkGarmentCompatibility.findUniqueOrThrow({
            where: { id: compatibility.id },
            include: { placements: true },
          });
        }),
    );
  }

  async deleteCompatibility(
    actor: AdminAuthenticatedSession,
    templateId: string,
    artworkVersionId: string,
    context: AdminRequestContext,
  ) {
    await this.mutate(
      actor,
      'garment.compatibility.delete',
      `${templateId}:${artworkVersionId}`,
      context,
      () =>
        this.database.client.artworkGarmentCompatibility.delete({
          where: {
            artworkVersionId_templateId: { artworkVersionId, templateId },
          },
        }),
    );
  }

  async validateConfiguration(input: GarmentConfigurationDto) {
    const version = await this.database.client.artworkVersion.findFirst({
      where: {
        id: input.artworkVersionId,
        status: ArtworkVersionStatus.PUBLISHED,
        artwork: { status: ArtworkStatus.PUBLISHED },
      },
      select: { artworkId: true },
    });
    const variant = await this.database.client.garmentVariant.findFirst({
      where: {
        id: input.garmentVariantId,
        status: ArtworkStatus.PUBLISHED,
        template: { status: ArtworkStatus.PUBLISHED },
        colour: { status: ArtworkStatus.PUBLISHED },
        size: { status: ArtworkStatus.PUBLISHED },
      },
    });
    if (!version || !variant) throw this.configurationInvalid();
    const placement = await this.database.client.garmentPlacement.findFirst({
      where: {
        id: input.placementId,
        templateId: variant.templateId,
        view: input.view,
        status: ArtworkStatus.PUBLISHED,
        scalePresets: {
          some: { slug: input.scalePreset, status: ArtworkStatus.PUBLISHED },
        },
        compatibilities: {
          some: {
            compatibility: {
              artworkVersionId: input.artworkVersionId,
              templateId: variant.templateId,
              status: CompatibilityStatus.APPROVED,
            },
          },
        },
      },
      include: {
        scalePresets: {
          where: { slug: input.scalePreset, status: ArtworkStatus.PUBLISHED },
          take: 1,
        },
      },
    });
    if (!placement || !placement.scalePresets[0]) throw this.configurationInvalid();
    return {
      valid: true as const,
      artworkId: version.artworkId,
      artworkVersionId: input.artworkVersionId,
      garmentTemplateId: variant.templateId,
      garmentVariantId: variant.id,
      placementId: placement.id,
      scalePresetId: placement.scalePresets[0].id,
      view: placement.view,
      quantity: input.quantity,
    };
  }

  private templateInclude(publicOnly: boolean): Prisma.GarmentTemplateInclude {
    const status = publicOnly ? { status: ArtworkStatus.PUBLISHED } : undefined;
    return {
      colours: { where: status, orderBy: { position: 'asc' } },
      sizes: {
        where: status,
        include: { measurements: { orderBy: { key: 'asc' } } },
        orderBy: { position: 'asc' },
      },
      variants: { where: status, orderBy: { sku: 'asc' } },
      placements: {
        where: status,
        include: {
          scalePresets: { where: status, orderBy: { position: 'asc' } },
        },
        orderBy: { position: 'asc' },
      },
      ...(!publicOnly
        ? {
            compatibilities: {
              include: { placements: true },
              orderBy: { createdAt: 'asc' as const },
            },
          }
        : {}),
    };
  }

  private async ensureTemplateStructuralMutationAllowed(templateId: string) {
    const template = await this.database.client.garmentTemplate.findUnique({
      where: { id: templateId },
      select: { status: true },
    });
    if (!template) throw this.notFound();
    if (template.status === ArtworkStatus.PUBLISHED) {
      throw this.validation(
        'Archive the garment before changing its approved catalogue structure.',
      );
    }
  }

  private async ensureTemplateReady(id: string) {
    const template = await this.database.client.garmentTemplate.findUnique({
      where: { id },
      select: {
        colours: { where: { status: ArtworkStatus.PUBLISHED }, take: 1 },
        sizes: { where: { status: ArtworkStatus.PUBLISHED }, take: 1 },
        variants: { where: { status: ArtworkStatus.PUBLISHED }, take: 1 },
        placements: {
          where: {
            status: ArtworkStatus.PUBLISHED,
            scalePresets: { some: { status: ArtworkStatus.PUBLISHED } },
          },
          take: 1,
        },
      },
    });
    if (!template) throw this.notFound();
    if (
      !template.colours.length ||
      !template.sizes.length ||
      !template.variants.length ||
      !template.placements.length
    ) {
      throw this.validation(
        'Publishing a garment requires a published colour, size, variant, placement, and scale preset.',
      );
    }
  }

  private async validateVariantMembers(templateId: string, input: GarmentVariantDto) {
    const [colour, size] = await Promise.all([
      this.database.client.garmentColour.findFirst({
        where: { id: input.colourId, templateId },
      }),
      this.database.client.garmentSize.findFirst({ where: { id: input.sizeId, templateId } }),
    ]);
    if (!colour || !size)
      throw this.validation('Variant colour and size must belong to the garment.');
    if (
      input.status === ArtworkStatus.PUBLISHED &&
      (colour.status !== ArtworkStatus.PUBLISHED || size.status !== ArtworkStatus.PUBLISHED)
    ) {
      throw this.validation('A published variant requires a published colour and size.');
    }
  }

  private async validateCompatibilityApproval(
    templateId: string,
    artworkVersionId: string,
    placementIds: string[],
  ) {
    if (!placementIds.length)
      throw this.validation('An approved compatibility requires at least one placement.');
    const [template, version] = await Promise.all([
      this.database.client.garmentTemplate.findFirst({
        where: { id: templateId, status: ArtworkStatus.PUBLISHED },
      }),
      this.database.client.artworkVersion.findFirst({
        where: {
          id: artworkVersionId,
          status: ArtworkVersionStatus.PUBLISHED,
          artwork: { status: ArtworkStatus.PUBLISHED },
        },
      }),
    ]);
    if (!template || !version)
      throw this.validation(
        'Approved compatibility requires an exact published artwork version and garment root.',
      );
    await this.validatePlacementMembership(templateId, placementIds, true);
  }

  private async validatePlacementMembership(
    templateId: string,
    placementIds: string[],
    requirePublished: boolean,
  ) {
    const uniqueIds = [...new Set(placementIds)];
    if (uniqueIds.length !== placementIds.length)
      throw this.validation('Compatibility placement identifiers must be unique.');
    const count = await this.database.client.garmentPlacement.count({
      where: {
        id: { in: uniqueIds },
        templateId,
        ...(requirePublished
          ? {
              status: ArtworkStatus.PUBLISHED,
              scalePresets: { some: { status: ArtworkStatus.PUBLISHED } },
            }
          : {}),
      },
    });
    if (count !== uniqueIds.length)
      throw this.validation(
        'Every compatibility placement must belong to the garment and be eligible.',
      );
  }

  private validateGeometry(input: GarmentPlacementDto) {
    if (
      input.xPermille + input.widthPermille > 1000 ||
      input.yPermille + input.heightPermille > 1000
    ) {
      throw this.validation('Placement geometry must remain inside the normalized garment canvas.');
    }
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
          resourceType: 'garment',
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
      ) {
        throw new ApiProblemException(
          'CONFLICT',
          HttpStatus.CONFLICT,
          'The garment change conflicts with existing data.',
        );
      }
      throw error;
    }
  }

  private notFound() {
    return new ApiProblemException(
      'RESOURCE_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      'Garment resource not found.',
    );
  }

  private validation(message: string) {
    return new ApiProblemException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST, message);
  }

  private configurationInvalid() {
    return new ApiProblemException(
      'CONFIGURATION_NOT_APPROVED',
      HttpStatus.UNPROCESSABLE_ENTITY,
      'The requested artwork and garment configuration is not approved.',
    );
  }
}
