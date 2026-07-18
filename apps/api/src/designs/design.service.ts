import { createHash, randomBytes } from 'node:crypto';

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { configurationCanonicalForm, type DesignConfigurationSummary } from '@tms/contracts';
import { DesignVisibility, Prisma, type GarmentView } from '@tms/database';

import type { AuthenticatedSession } from '../auth/auth.types.js';
import { DatabaseService } from '../database/database.service.js';
import { GarmentService } from '../garments/garment.service.js';
import { ApiProblemException } from '../platform/api-problem.exception.js';
import type { SaveDesignDto, UpdateDesignDto } from './design.dto.js';

/**
 * Every read resolves the artwork root and garment template through the stored exact IDs, plus the
 * display labels so a saved design renders without a catalogue re-join (TMS-FBR-020).
 */
const withRelations = {
  artworkVersion: {
    select: { artworkId: true, title: true, artwork: { select: { slug: true } } },
  },
  garmentVariant: {
    select: {
      templateId: true,
      template: { select: { title: true } },
      colour: { select: { name: true, hex: true } },
      size: { select: { label: true } },
    },
  },
  placement: { select: { name: true } },
  scalePreset: { select: { name: true } },
} as const;

type DesignWithRelations = Prisma.DesignConfigurationGetPayload<{
  include: typeof withRelations;
}>;

interface ResolvedTuple {
  artworkVersionId: string;
  garmentVariantId: string;
  placementId: string;
  scalePresetId: string;
  view: GarmentView;
}

@Injectable()
export class DesignService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(GarmentService) private readonly garments: GarmentService,
  ) {}

  /**
   * The hash covers the exact approved tuple and nothing else, so the same design saved twice
   * collapses onto one row regardless of name, visibility, or when it was saved.
   */
  private hash(tuple: ResolvedTuple): string {
    // One definition, shared with cart lines, so a saved design and its cart line agree.
    return createHash('sha256').update(configurationCanonicalForm(tuple)).digest('hex');
  }

  private async resolve(input: SaveDesignDto): Promise<ResolvedTuple> {
    // Reuse the server-authoritative garment validation rather than re-deriving approval here.
    const validation = await this.garments.validateConfiguration({
      artworkVersionId: input.artworkVersionId,
      garmentVariantId: input.garmentVariantId,
      placementId: input.placementId,
      scalePreset: input.scalePreset,
      view: input.view,
      quantity: 1,
    });
    return {
      artworkVersionId: validation.artworkVersionId,
      garmentVariantId: validation.garmentVariantId,
      placementId: validation.placementId,
      scalePresetId: validation.scalePresetId,
      view: validation.view,
    };
  }

  async save(
    actor: AuthenticatedSession,
    input: SaveDesignDto,
  ): Promise<{ design: DesignConfigurationSummary; created: boolean }> {
    const tuple = await this.resolve(input);
    const configurationHash = this.hash(tuple);
    const ownerUserId = actor.session.user.id;

    const existing = await this.database.client.designConfiguration.findUnique({
      where: { ownerUserId_configurationHash: { ownerUserId, configurationHash } },
      include: withRelations,
    });
    if (existing) return { design: this.toContract(existing, true), created: false };

    try {
      const created = await this.database.client.designConfiguration.create({
        data: {
          ownerUserId,
          artworkVersionId: tuple.artworkVersionId,
          garmentVariantId: tuple.garmentVariantId,
          placementId: tuple.placementId,
          scalePresetId: tuple.scalePresetId,
          view: tuple.view,
          configurationHash,
          name: input.name ?? null,
        },
        include: withRelations,
      });
      return { design: this.toContract(created, true), created: true };
    } catch (error) {
      // A concurrent identical save is not an error; return whichever row won the race.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await this.database.client.designConfiguration.findUniqueOrThrow({
          where: { ownerUserId_configurationHash: { ownerUserId, configurationHash } },
          include: withRelations,
        });
        return { design: this.toContract(winner, false), created: false };
      }
      throw error;
    }
  }

  async list(actor: AuthenticatedSession): Promise<DesignConfigurationSummary[]> {
    const designs = await this.database.client.designConfiguration.findMany({
      where: { ownerUserId: actor.session.user.id },
      orderBy: { createdAt: 'desc' },
      include: withRelations,
    });
    return designs.map((design) => this.toContract(design, true));
  }

  async get(actor: AuthenticatedSession, id: string): Promise<DesignConfigurationSummary> {
    return this.toContract(await this.ownedOrNotFound(actor, id), true);
  }

  async update(
    actor: AuthenticatedSession,
    id: string,
    input: UpdateDesignDto,
  ): Promise<DesignConfigurationSummary> {
    const design = await this.ownedOrNotFound(actor, id);
    if (!Object.values(input).some((value) => value !== undefined)) {
      throw new ApiProblemException(
        'VALIDATION_FAILED',
        HttpStatus.BAD_REQUEST,
        'At least one design field is required.',
      );
    }
    const data: Prisma.DesignConfigurationUpdateInput = {};
    if (input.name !== undefined) data.name = input.name === null ? null : input.name.trim();
    if (input.visibility !== undefined) {
      data.visibility = input.visibility;
      // The database enforces that an unlisted design has a token and a private one does not.
      data.shareToken =
        input.visibility === DesignVisibility.UNLISTED
          ? (design.shareToken ?? this.newShareToken())
          : null;
    }
    const updated = await this.database.client.designConfiguration.update({
      where: { id: design.id },
      data,
      include: withRelations,
    });
    return this.toContract(updated, true);
  }

  /** Rotating invalidates the previous link immediately; that is the point of the operation. */
  async rotateShare(actor: AuthenticatedSession, id: string): Promise<DesignConfigurationSummary> {
    const design = await this.ownedOrNotFound(actor, id);
    const updated = await this.database.client.designConfiguration.update({
      where: { id: design.id },
      data: { visibility: DesignVisibility.UNLISTED, shareToken: this.newShareToken() },
      include: withRelations,
    });
    return this.toContract(updated, true);
  }

  async remove(actor: AuthenticatedSession, id: string): Promise<void> {
    const design = await this.ownedOrNotFound(actor, id);
    await this.database.client.designConfiguration.delete({ where: { id: design.id } });
  }

  /** Public read by share token. Never exposes the owner or the token itself. */
  async getShared(token: string): Promise<DesignConfigurationSummary> {
    const design = await this.database.client.designConfiguration.findFirst({
      where: { shareToken: token, visibility: DesignVisibility.UNLISTED },
      include: withRelations,
    });
    if (!design) throw this.notFound();
    return this.toContract(design, false);
  }

  /**
   * A design owned by someone else is reported as not found rather than forbidden, so the
   * endpoint cannot be used to probe which design identifiers exist.
   */
  private async ownedOrNotFound(
    actor: AuthenticatedSession,
    id: string,
  ): Promise<DesignWithRelations> {
    const design = await this.database.client.designConfiguration.findFirst({
      where: { id, ownerUserId: actor.session.user.id },
      include: withRelations,
    });
    if (!design) throw this.notFound();
    return design;
  }

  private newShareToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private notFound(): ApiProblemException {
    return new ApiProblemException('RESOURCE_NOT_FOUND', HttpStatus.NOT_FOUND, 'Design not found.');
  }

  private toContract(
    design: DesignWithRelations,
    includeShareToken: boolean,
  ): DesignConfigurationSummary {
    return {
      id: design.id,
      artworkId: design.artworkVersion.artworkId,
      artworkVersionId: design.artworkVersionId,
      garmentTemplateId: design.garmentVariant.templateId,
      garmentVariantId: design.garmentVariantId,
      placementId: design.placementId,
      scalePresetId: design.scalePresetId,
      view: design.view,
      configurationHash: design.configurationHash,
      name: design.name,
      visibility: design.visibility,
      shareToken: includeShareToken ? design.shareToken : null,
      display: {
        artworkTitle: design.artworkVersion.title,
        artworkSlug: design.artworkVersion.artwork.slug,
        garmentTitle: design.garmentVariant.template.title,
        colourName: design.garmentVariant.colour.name,
        colourHex: design.garmentVariant.colour.hex,
        sizeLabel: design.garmentVariant.size.label,
        placementName: design.placement.name,
        scaleName: design.scalePreset.name,
        thumbnailUrl: null,
      },
      createdAt: design.createdAt.toISOString(),
      updatedAt: design.updatedAt.toISOString(),
    };
  }
}
