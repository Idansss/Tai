import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiExtraModels, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ApiResponse } from '@tms/contracts';
import type { Request } from 'express';

import { RequireAdminPermissions } from '../admin-auth/admin-authorization.js';
import { AdminPermissionGuard } from '../admin-auth/admin-permission.guard.js';
import { AdminSessionGuard } from '../admin-auth/admin-session.guard.js';
import type { AdminRequestContext } from '../admin-auth/admin-auth.types.js';
import {
  AssociationDto,
  ArtworkCatalogueQueryDto,
  CatalogueEntryDto,
  CatalogueEntryUpdateDto,
  CatalogueListQueryDto,
  DropDto,
  DropUpdateDto,
  EditionDto,
  StoryDto,
  TagDto,
} from './catalogue.dto.js';
import { CatalogueService } from './catalogue.service.js';

@ApiTags('administrator-catalogue')
@ApiExtraModels(
  AssociationDto,
  CatalogueEntryDto,
  CatalogueEntryUpdateDto,
  DropDto,
  DropUpdateDto,
  EditionDto,
  StoryDto,
  TagDto,
)
@ApiCookieAuth('tms_admin_session')
@UseGuards(AdminSessionGuard, AdminPermissionGuard)
@Controller('admin/catalogue')
export class AdminCatalogueController {
  constructor(@Inject(CatalogueService) private readonly service: CatalogueService) {}

  @Get('tags')
  @RequireAdminPermissions('catalogue.read')
  @ApiOperation({ operationId: 'listAdministratorTags' })
  async listTags(@Req() req: Request) {
    return this.respond(req, await this.service.listTags());
  }
  @Post('tags')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'createAdministratorTag' })
  async createTag(@Body() input: TagDto, @Req() req: Request) {
    return this.respond(
      req,
      await this.service.createTag(req.adminSession!, input, this.context(req)),
    );
  }
  @Put('tags/:id')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'updateAdministratorTag' })
  async updateTag(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: TagDto,
    @Req() req: Request,
  ) {
    return this.respond(
      req,
      await this.service.updateTag(req.adminSession!, id, input, this.context(req)),
    );
  }
  @Delete('tags/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'deleteAdministratorTag' })
  async deleteTag(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    await this.service.deleteTag(req.adminSession!, id, this.context(req));
  }
  @Put('tags/:id/artworks/:artworkId')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'attachAdministratorArtworkTag' })
  async linkTag(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('artworkId', new ParseUUIDPipe()) artworkId: string,
    @Req() req: Request,
  ) {
    return this.respond(
      req,
      await this.service.linkTag(req.adminSession!, id, artworkId, this.context(req)),
    );
  }
  @Delete('tags/:id/artworks/:artworkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'detachAdministratorArtworkTag' })
  async unlinkTag(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('artworkId', new ParseUUIDPipe()) artworkId: string,
    @Req() req: Request,
  ) {
    await this.service.unlinkTag(req.adminSession!, id, artworkId, this.context(req));
  }

  @Get('collections')
  @RequireAdminPermissions('catalogue.read')
  @ApiOperation({ operationId: 'listAdministratorCollections' })
  async listCollections(@Req() req: Request) {
    return this.respond(req, await this.service.listCollections());
  }
  @Post('collections')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'createAdministratorCollection' })
  async createCollection(@Body() input: CatalogueEntryDto, @Req() req: Request) {
    return this.respond(
      req,
      await this.service.createCollection(req.adminSession!, input, this.context(req)),
    );
  }
  @Patch('collections/:id')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'updateAdministratorCollection' })
  async updateCollection(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: CatalogueEntryUpdateDto,
    @Req() req: Request,
  ) {
    return this.respond(
      req,
      await this.service.updateCollection(req.adminSession!, id, input, this.context(req)),
    );
  }
  @Delete('collections/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'deleteAdministratorCollection' })
  async deleteCollection(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    await this.service.deleteCollection(req.adminSession!, id, this.context(req));
  }
  @Put('collections/:id/artworks/:artworkId')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'attachAdministratorCollectionArtwork' })
  async linkCollection(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('artworkId', new ParseUUIDPipe()) artworkId: string,
    @Body() input: AssociationDto,
    @Req() req: Request,
  ) {
    return this.respond(
      req,
      await this.service.linkCollection(req.adminSession!, id, artworkId, input, this.context(req)),
    );
  }
  @Delete('collections/:id/artworks/:artworkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'detachAdministratorCollectionArtwork' })
  async unlinkCollection(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('artworkId', new ParseUUIDPipe()) artworkId: string,
    @Req() req: Request,
  ) {
    await this.service.unlinkCollection(req.adminSession!, id, artworkId, this.context(req));
  }

  @Get('drops')
  @RequireAdminPermissions('catalogue.read')
  @ApiOperation({ operationId: 'listAdministratorDrops' })
  async listDrops(@Req() req: Request) {
    return this.respond(req, await this.service.listDrops());
  }
  @Post('drops')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'createAdministratorDrop' })
  async createDrop(@Body() input: DropDto, @Req() req: Request) {
    return this.respond(
      req,
      await this.service.createDrop(req.adminSession!, input, this.context(req)),
    );
  }
  @Patch('drops/:id')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'updateAdministratorDrop' })
  async updateDrop(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: DropUpdateDto,
    @Req() req: Request,
  ) {
    return this.respond(
      req,
      await this.service.updateDrop(req.adminSession!, id, input, this.context(req)),
    );
  }
  @Delete('drops/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'deleteAdministratorDrop' })
  async deleteDrop(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    await this.service.deleteDrop(req.adminSession!, id, this.context(req));
  }
  @Put('drops/:id/artworks/:artworkId')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'attachAdministratorDropArtwork' })
  async linkDrop(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('artworkId', new ParseUUIDPipe()) artworkId: string,
    @Body() input: AssociationDto,
    @Req() req: Request,
  ) {
    return this.respond(
      req,
      await this.service.linkDrop(req.adminSession!, id, artworkId, input, this.context(req)),
    );
  }
  @Delete('drops/:id/artworks/:artworkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'detachAdministratorDropArtwork' })
  async unlinkDrop(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('artworkId', new ParseUUIDPipe()) artworkId: string,
    @Req() req: Request,
  ) {
    await this.service.unlinkDrop(req.adminSession!, id, artworkId, this.context(req));
  }

  @Get('editions')
  @RequireAdminPermissions('catalogue.read')
  @ApiOperation({ operationId: 'listAdministratorEditions' })
  async listEditions(@Req() req: Request) {
    return this.respond(req, await this.service.listEditions());
  }
  @Post('artworks/:artworkId/editions')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'createAdministratorEdition' })
  async createEdition(
    @Param('artworkId', new ParseUUIDPipe()) artworkId: string,
    @Body() input: EditionDto,
    @Req() req: Request,
  ) {
    return this.respond(
      req,
      await this.service.createEdition(req.adminSession!, artworkId, input, this.context(req)),
    );
  }
  @Put('editions/:id')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'updateAdministratorEdition' })
  async updateEdition(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: EditionDto,
    @Req() req: Request,
  ) {
    return this.respond(
      req,
      await this.service.updateEdition(req.adminSession!, id, input, this.context(req)),
    );
  }
  @Delete('editions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'deleteAdministratorEdition' })
  async deleteEdition(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    await this.service.deleteEdition(req.adminSession!, id, this.context(req));
  }

  @Get('stories')
  @RequireAdminPermissions('catalogue.read')
  @ApiOperation({ operationId: 'listAdministratorStories' })
  async listStories(@Req() req: Request) {
    return this.respond(req, await this.service.listStories());
  }
  @Post('stories')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'createAdministratorStory' })
  async createStory(@Body() input: StoryDto, @Req() req: Request) {
    return this.respond(
      req,
      await this.service.createStory(req.adminSession!, input, this.context(req)),
    );
  }
  @Put('stories/:id')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'updateAdministratorStory' })
  async updateStory(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: StoryDto,
    @Req() req: Request,
  ) {
    return this.respond(
      req,
      await this.service.updateStory(req.adminSession!, id, input, this.context(req)),
    );
  }
  @Delete('stories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'deleteAdministratorStory' })
  async deleteStory(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    await this.service.deleteStory(req.adminSession!, id, this.context(req));
  }

  private respond(request: Request, data: unknown): ApiResponse<unknown> {
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

@ApiTags('catalogue')
@ApiExtraModels(ArtworkCatalogueQueryDto, CatalogueListQueryDto)
@Controller()
export class PublicCatalogueController {
  constructor(@Inject(CatalogueService) private readonly service: CatalogueService) {}
  @Get('collections') @ApiOperation({ operationId: 'listPublishedCollections' }) async collections(
    @Query() query: CatalogueListQueryDto,
    @Req() req: Request,
  ) {
    return this.respond(req, await this.service.listCollections(true, query));
  }
  @Get('collections/:slug')
  @ApiOperation({ operationId: 'getPublishedCollection' })
  async collection(@Param('slug') slug: string, @Req() req: Request) {
    return this.respond(req, await this.service.getCollection(slug, true));
  }
  @Get('drops') @ApiOperation({ operationId: 'listPublishedDrops' }) async drops(
    @Query() query: CatalogueListQueryDto,
    @Req() req: Request,
  ) {
    return this.respond(req, await this.service.listDrops(true, query));
  }
  @Get('drops/:slug') @ApiOperation({ operationId: 'getPublishedDrop' }) async drop(
    @Param('slug') slug: string,
    @Req() req: Request,
  ) {
    return this.respond(req, await this.service.getDrop(slug, true));
  }
  @Get('stories') @ApiOperation({ operationId: 'listPublishedStories' }) async stories(
    @Query() query: CatalogueListQueryDto,
    @Req() req: Request,
  ) {
    return this.respond(req, await this.service.listStories(true, query));
  }
  @Get('stories/:slug') @ApiOperation({ operationId: 'getPublishedStory' }) async story(
    @Param('slug') slug: string,
    @Req() req: Request,
  ) {
    return this.respond(req, await this.service.getStory(slug, true));
  }
  private respond(request: Request, data: unknown): ApiResponse<unknown> {
    return { data, meta: { correlationId: request.correlationId ?? 'unavailable' } };
  }
}
