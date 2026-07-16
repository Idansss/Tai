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

import type { AdminRequestContext } from '../admin-auth/admin-auth.types.js';
import { RequireAdminPermissions } from '../admin-auth/admin-authorization.js';
import { AdminPermissionGuard } from '../admin-auth/admin-permission.guard.js';
import { AdminSessionGuard } from '../admin-auth/admin-session.guard.js';
import {
  GarmentColourDto,
  GarmentCompatibilityDto,
  GarmentConfigurationDto,
  GarmentListQueryDto,
  GarmentMeasurementDto,
  GarmentPlacementDto,
  GarmentScalePresetDto,
  GarmentSizeDto,
  GarmentTemplateDto,
  GarmentTemplateUpdateDto,
  GarmentVariantDto,
} from './garment.dto.js';
import { GarmentService } from './garment.service.js';

@ApiTags('administrator-garments')
@ApiExtraModels(
  GarmentColourDto,
  GarmentCompatibilityDto,
  GarmentMeasurementDto,
  GarmentPlacementDto,
  GarmentScalePresetDto,
  GarmentSizeDto,
  GarmentTemplateDto,
  GarmentTemplateUpdateDto,
  GarmentVariantDto,
)
@ApiCookieAuth('tms_admin_session')
@UseGuards(AdminSessionGuard, AdminPermissionGuard)
@Controller('admin/garments')
export class AdminGarmentController {
  constructor(@Inject(GarmentService) private readonly service: GarmentService) {}

  @Get()
  @RequireAdminPermissions('catalogue.read')
  @ApiOperation({ operationId: 'listAdministratorGarments' })
  async list(@Req() request: Request) {
    return this.respond(request, await this.service.listTemplates());
  }

  @Get(':id')
  @RequireAdminPermissions('catalogue.read')
  @ApiOperation({ operationId: 'getAdministratorGarment' })
  async get(@Param('id', new ParseUUIDPipe()) id: string, @Req() request: Request) {
    return this.respond(request, await this.service.getTemplateById(id));
  }

  @Post()
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'createAdministratorGarment' })
  async create(@Body() input: GarmentTemplateDto, @Req() request: Request) {
    return this.respond(
      request,
      await this.service.createTemplate(request.adminSession!, input, this.context(request)),
    );
  }

  @Patch(':id')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'updateAdministratorGarment' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: GarmentTemplateUpdateDto,
    @Req() request: Request,
  ) {
    return this.respond(
      request,
      await this.service.updateTemplate(request.adminSession!, id, input, this.context(request)),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'deleteAdministratorGarment' })
  async delete(@Param('id', new ParseUUIDPipe()) id: string, @Req() request: Request) {
    await this.service.deleteTemplate(request.adminSession!, id, this.context(request));
  }

  @Post(':templateId/colours')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'createAdministratorGarmentColour' })
  async createColour(
    @Param('templateId', new ParseUUIDPipe()) templateId: string,
    @Body() input: GarmentColourDto,
    @Req() request: Request,
  ) {
    return this.respond(
      request,
      await this.service.createColour(
        request.adminSession!,
        templateId,
        input,
        this.context(request),
      ),
    );
  }

  @Put('colours/:id')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'updateAdministratorGarmentColour' })
  async updateColour(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: GarmentColourDto,
    @Req() request: Request,
  ) {
    return this.respond(
      request,
      await this.service.updateColour(request.adminSession!, id, input, this.context(request)),
    );
  }

  @Delete('colours/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'deleteAdministratorGarmentColour' })
  async deleteColour(@Param('id', new ParseUUIDPipe()) id: string, @Req() request: Request) {
    await this.service.deleteColour(request.adminSession!, id, this.context(request));
  }

  @Post(':templateId/sizes')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'createAdministratorGarmentSize' })
  async createSize(
    @Param('templateId', new ParseUUIDPipe()) templateId: string,
    @Body() input: GarmentSizeDto,
    @Req() request: Request,
  ) {
    return this.respond(
      request,
      await this.service.createSize(
        request.adminSession!,
        templateId,
        input,
        this.context(request),
      ),
    );
  }

  @Put('sizes/:id')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'updateAdministratorGarmentSize' })
  async updateSize(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: GarmentSizeDto,
    @Req() request: Request,
  ) {
    return this.respond(
      request,
      await this.service.updateSize(request.adminSession!, id, input, this.context(request)),
    );
  }

  @Delete('sizes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'deleteAdministratorGarmentSize' })
  async deleteSize(@Param('id', new ParseUUIDPipe()) id: string, @Req() request: Request) {
    await this.service.deleteSize(request.adminSession!, id, this.context(request));
  }

  @Post(':templateId/variants')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'createAdministratorGarmentVariant' })
  async createVariant(
    @Param('templateId', new ParseUUIDPipe()) templateId: string,
    @Body() input: GarmentVariantDto,
    @Req() request: Request,
  ) {
    return this.respond(
      request,
      await this.service.createVariant(
        request.adminSession!,
        templateId,
        input,
        this.context(request),
      ),
    );
  }

  @Put('variants/:id')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'updateAdministratorGarmentVariant' })
  async updateVariant(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: GarmentVariantDto,
    @Req() request: Request,
  ) {
    return this.respond(
      request,
      await this.service.updateVariant(request.adminSession!, id, input, this.context(request)),
    );
  }

  @Delete('variants/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'deleteAdministratorGarmentVariant' })
  async deleteVariant(@Param('id', new ParseUUIDPipe()) id: string, @Req() request: Request) {
    await this.service.deleteVariant(request.adminSession!, id, this.context(request));
  }

  @Post(':templateId/placements')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'createAdministratorGarmentPlacement' })
  async createPlacement(
    @Param('templateId', new ParseUUIDPipe()) templateId: string,
    @Body() input: GarmentPlacementDto,
    @Req() request: Request,
  ) {
    return this.respond(
      request,
      await this.service.createPlacement(
        request.adminSession!,
        templateId,
        input,
        this.context(request),
      ),
    );
  }

  @Put('placements/:id')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'updateAdministratorGarmentPlacement' })
  async updatePlacement(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: GarmentPlacementDto,
    @Req() request: Request,
  ) {
    return this.respond(
      request,
      await this.service.updatePlacement(request.adminSession!, id, input, this.context(request)),
    );
  }

  @Delete('placements/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'deleteAdministratorGarmentPlacement' })
  async deletePlacement(@Param('id', new ParseUUIDPipe()) id: string, @Req() request: Request) {
    await this.service.deletePlacement(request.adminSession!, id, this.context(request));
  }

  @Post('placements/:placementId/scale-presets')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'createAdministratorGarmentScalePreset' })
  async createScalePreset(
    @Param('placementId', new ParseUUIDPipe()) placementId: string,
    @Body() input: GarmentScalePresetDto,
    @Req() request: Request,
  ) {
    return this.respond(
      request,
      await this.service.createScalePreset(
        request.adminSession!,
        placementId,
        input,
        this.context(request),
      ),
    );
  }

  @Put('scale-presets/:id')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'updateAdministratorGarmentScalePreset' })
  async updateScalePreset(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: GarmentScalePresetDto,
    @Req() request: Request,
  ) {
    return this.respond(
      request,
      await this.service.updateScalePreset(request.adminSession!, id, input, this.context(request)),
    );
  }

  @Delete('scale-presets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'deleteAdministratorGarmentScalePreset' })
  async deleteScalePreset(@Param('id', new ParseUUIDPipe()) id: string, @Req() request: Request) {
    await this.service.deleteScalePreset(request.adminSession!, id, this.context(request));
  }

  @Put(':templateId/compatibilities/:artworkVersionId')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'setAdministratorArtworkGarmentCompatibility' })
  async setCompatibility(
    @Param('templateId', new ParseUUIDPipe()) templateId: string,
    @Param('artworkVersionId', new ParseUUIDPipe()) artworkVersionId: string,
    @Body() input: GarmentCompatibilityDto,
    @Req() request: Request,
  ) {
    return this.respond(
      request,
      await this.service.setCompatibility(
        request.adminSession!,
        templateId,
        artworkVersionId,
        input,
        this.context(request),
      ),
    );
  }

  @Delete(':templateId/compatibilities/:artworkVersionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({ operationId: 'deleteAdministratorArtworkGarmentCompatibility' })
  async deleteCompatibility(
    @Param('templateId', new ParseUUIDPipe()) templateId: string,
    @Param('artworkVersionId', new ParseUUIDPipe()) artworkVersionId: string,
    @Req() request: Request,
  ) {
    await this.service.deleteCompatibility(
      request.adminSession!,
      templateId,
      artworkVersionId,
      this.context(request),
    );
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

@ApiTags('garments')
@ApiExtraModels(GarmentConfigurationDto, GarmentListQueryDto)
@Controller()
export class PublicGarmentController {
  constructor(@Inject(GarmentService) private readonly service: GarmentService) {}

  @Get('garments')
  @ApiOperation({ operationId: 'listPublishedGarments' })
  async list(@Query() query: GarmentListQueryDto, @Req() request: Request) {
    return this.respond(request, await this.service.listTemplates(true, query));
  }

  @Get('garments/:slug')
  @ApiOperation({ operationId: 'getPublishedGarment' })
  async get(@Param('slug') slug: string, @Req() request: Request) {
    return this.respond(request, await this.service.getTemplate(slug, true));
  }

  @Get('artworks/:slug/compatible-garments')
  @ApiOperation({ operationId: 'listPublishedArtworkCompatibleGarments' })
  async compatible(@Param('slug') slug: string, @Req() request: Request) {
    return this.respond(request, await this.service.listCompatibleTemplates(slug));
  }

  @Post('garment-configurations/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'validatePublishedGarmentConfiguration' })
  async validate(@Body() input: GarmentConfigurationDto, @Req() request: Request) {
    return this.respond(request, await this.service.validateConfiguration(input));
  }

  private respond(request: Request, data: unknown): ApiResponse<unknown> {
    return { data, meta: { correlationId: request.correlationId ?? 'unavailable' } };
  }
}
