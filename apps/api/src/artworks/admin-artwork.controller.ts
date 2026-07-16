import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AdminArtwork, ApiResponse, CursorPage } from '@tms/contracts';
import type { Request } from 'express';

import { RequireAdminPermissions } from '../admin-auth/admin-authorization.js';
import { AdminPermissionGuard } from '../admin-auth/admin-permission.guard.js';
import { AdminSessionGuard } from '../admin-auth/admin-session.guard.js';
import type { AdminRequestContext } from '../admin-auth/admin-auth.types.js';
import { ArtworkCreateDto, ArtworkListQueryDto, ArtworkVersionInputDto } from './artwork.dto.js';
import { ArtworkService } from './artwork.service.js';

@ApiTags('administrator-artworks')
@ApiExtraModels(ArtworkCreateDto, ArtworkListQueryDto, ArtworkVersionInputDto)
@ApiCookieAuth('tms_admin_session')
@UseGuards(AdminSessionGuard, AdminPermissionGuard)
@Controller('admin/artworks')
export class AdminArtworkController {
  constructor(@Inject(ArtworkService) private readonly artworkService: ArtworkService) {}

  @Get()
  @RequireAdminPermissions('catalogue.read')
  @ApiOperation({
    operationId: 'listAdministratorArtworks',
    summary: 'List artworks and every immutable version for administration',
  })
  @ApiOkResponse({ description: 'A cursor page of administrator artwork records.' })
  async list(
    @Query() query: ArtworkListQueryDto,
    @Req() request: Request,
  ): Promise<ApiResponse<CursorPage<AdminArtwork>>> {
    const page = await this.artworkService.listAdminArtworks(query);
    return this.respond(request, page);
  }

  @Get(':artworkId')
  @RequireAdminPermissions('catalogue.read')
  @ApiOperation({
    operationId: 'getAdministratorArtwork',
    summary: 'Get an artwork and its immutable version history',
  })
  @ApiOkResponse({ description: 'The administrator artwork record.' })
  async get(
    @Param('artworkId', new ParseUUIDPipe()) artworkId: string,
    @Req() request: Request,
  ): Promise<ApiResponse<AdminArtwork>> {
    return this.respond(request, await this.artworkService.getAdminArtwork(artworkId));
  }

  @Post()
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({
    operationId: 'createAdministratorArtwork',
    summary: 'Create an artwork root and its first immutable draft version',
  })
  @ApiCreatedResponse({ description: 'The draft artwork and version were created.' })
  async create(
    @Body() input: ArtworkCreateDto,
    @Req() request: Request,
  ): Promise<ApiResponse<AdminArtwork>> {
    const artwork = await this.artworkService.createArtwork(
      request.adminSession!,
      input,
      this.context(request),
    );
    return this.respond(request, artwork);
  }

  @Post(':artworkId/versions')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({
    operationId: 'createAdministratorArtworkVersion',
    summary: 'Create the next immutable draft version of an artwork',
  })
  @ApiCreatedResponse({ description: 'A new immutable draft version was created.' })
  async createVersion(
    @Param('artworkId', new ParseUUIDPipe()) artworkId: string,
    @Body() input: ArtworkVersionInputDto,
    @Req() request: Request,
  ): Promise<ApiResponse<AdminArtwork>> {
    const artwork = await this.artworkService.createVersion(
      request.adminSession!,
      artworkId,
      input,
      this.context(request),
    );
    return this.respond(request, artwork);
  }

  @Post(':artworkId/versions/:versionId/publish')
  @HttpCode(HttpStatus.OK)
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({
    operationId: 'publishAdministratorArtworkVersion',
    summary: 'Publish an exact artwork version and archive the previous publication',
  })
  @ApiOkResponse({ description: 'The selected immutable version is now published.' })
  async publishVersion(
    @Param('artworkId', new ParseUUIDPipe()) artworkId: string,
    @Param('versionId', new ParseUUIDPipe()) versionId: string,
    @Req() request: Request,
  ): Promise<ApiResponse<AdminArtwork>> {
    const artwork = await this.artworkService.publishVersion(
      request.adminSession!,
      artworkId,
      versionId,
      this.context(request),
    );
    return this.respond(request, artwork);
  }

  @Post(':artworkId/versions/:versionId/archive')
  @HttpCode(HttpStatus.OK)
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({
    operationId: 'archiveAdministratorArtworkVersion',
    summary: 'Archive an exact artwork version without deleting it',
  })
  @ApiOkResponse({ description: 'The selected immutable version is archived.' })
  async archiveVersion(
    @Param('artworkId', new ParseUUIDPipe()) artworkId: string,
    @Param('versionId', new ParseUUIDPipe()) versionId: string,
    @Req() request: Request,
  ): Promise<ApiResponse<AdminArtwork>> {
    const artwork = await this.artworkService.archiveVersion(
      request.adminSession!,
      artworkId,
      versionId,
      this.context(request),
    );
    return this.respond(request, artwork);
  }

  @Post(':artworkId/archive')
  @HttpCode(HttpStatus.OK)
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({
    operationId: 'archiveAdministratorArtwork',
    summary: 'Archive an artwork and its currently published version',
  })
  @ApiOkResponse({ description: 'The artwork is archived and no longer publicly visible.' })
  async archiveArtwork(
    @Param('artworkId', new ParseUUIDPipe()) artworkId: string,
    @Req() request: Request,
  ): Promise<ApiResponse<AdminArtwork>> {
    const artwork = await this.artworkService.archiveArtwork(
      request.adminSession!,
      artworkId,
      this.context(request),
    );
    return this.respond(request, artwork);
  }

  private respond<T>(request: Request, data: T): ApiResponse<T> {
    return { data, meta: { correlationId: request.correlationId ?? 'unavailable' } };
  }

  private context(request: Request): AdminRequestContext {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent'),
      correlationId: request.correlationId ?? 'unavailable',
    };
  }
}
