import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { ApiResponse, MediaAsset } from '@tms/contracts';
import type { Request } from 'express';

import { RequireAdminPermissions } from '../admin-auth/admin-authorization.js';
import { AdminPermissionGuard } from '../admin-auth/admin-permission.guard.js';
import { AdminSessionGuard } from '../admin-auth/admin-session.guard.js';
import { MockupApprovalDto, MockupUploadDto } from './media.dto.js';
import { MediaService } from './media.service.js';

const uploadBody = {
  schema: {
    type: 'object',
    required: ['file'],
    properties: { file: { type: 'string', format: 'binary' } },
  },
};

@ApiTags('administrator-media')
@ApiExtraModels(MockupApprovalDto, MockupUploadDto)
@ApiCookieAuth('tms_admin_session')
@UseGuards(AdminSessionGuard, AdminPermissionGuard)
@Controller('admin')
export class AdminMediaController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}

  @Get('artworks/:artworkId/versions/:versionId/media')
  @RequireAdminPermissions('catalogue.read')
  @ApiOperation({
    operationId: 'listAdministratorArtworkMedia',
    summary: 'List exact-version media and processing state',
  })
  @ApiOkResponse({ description: 'Exact-version media assets.' })
  async list(
    @Param('artworkId', new ParseUUIDPipe()) artworkId: string,
    @Param('versionId', new ParseUUIDPipe()) versionId: string,
    @Req() request: Request,
  ): Promise<ApiResponse<MediaAsset[]>> {
    return this.respond(request, await this.media.listAdmin(artworkId, versionId));
  }

  @Post('artworks/:artworkId/versions/:versionId/media/original')
  @RequireAdminPermissions('catalogue.write')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 + 1, files: 1 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody(uploadBody)
  @ApiOperation({
    operationId: 'uploadAdministratorArtworkOriginal',
    summary: 'Ingest one immutable exact-version artwork original',
  })
  @ApiCreatedResponse({ description: 'Original was stored and derivative processing was queued.' })
  async uploadOriginal(
    @Param('artworkId', new ParseUUIDPipe()) artworkId: string,
    @Param('versionId', new ParseUUIDPipe()) versionId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: Request,
  ): Promise<ApiResponse<MediaAsset>> {
    return this.respond(
      request,
      await this.media.uploadOriginal(request.adminSession!, artworkId, versionId, file),
    );
  }

  @Post('artworks/:artworkId/versions/:versionId/media/mockups')
  @RequireAdminPermissions('catalogue.write')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 + 1, files: 1 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    operationId: 'uploadAdministratorArtworkMockup',
    summary: 'Ingest a generated mockup pending administrator approval',
  })
  @ApiCreatedResponse({ description: 'Mockup was stored privately pending approval.' })
  async uploadMockup(
    @Param('artworkId', new ParseUUIDPipe()) artworkId: string,
    @Param('versionId', new ParseUUIDPipe()) versionId: string,
    @Body() body: MockupUploadDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: Request,
  ): Promise<ApiResponse<MediaAsset>> {
    return this.respond(
      request,
      await this.media.uploadMockup(request.adminSession!, artworkId, versionId, body, file),
    );
  }

  @Patch('media/mockups/:assetId/approval')
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({
    operationId: 'decideAdministratorArtworkMockup',
    summary: 'Approve or reject a mockup for public use',
  })
  @ApiOkResponse({ description: 'Mockup approval decision was recorded.' })
  async decide(
    @Param('assetId', new ParseUUIDPipe()) assetId: string,
    @Body() body: MockupApprovalDto,
    @Req() request: Request,
  ): Promise<ApiResponse<MediaAsset>> {
    return this.respond(
      request,
      await this.media.decideMockup(request.adminSession!, assetId, body),
    );
  }

  @Post('media/originals/:assetId/retry')
  @HttpCode(HttpStatus.OK)
  @RequireAdminPermissions('catalogue.write')
  @ApiOperation({
    operationId: 'retryAdministratorArtworkMediaProcessing',
    summary: 'Retry a failed exact-version derivative job',
  })
  @ApiOkResponse({ description: 'Derivative processing was queued again.' })
  async retry(
    @Param('assetId', new ParseUUIDPipe()) assetId: string,
    @Req() request: Request,
  ): Promise<ApiResponse<MediaAsset>> {
    return this.respond(request, await this.media.retry(request.adminSession!, assetId));
  }

  private respond<T>(request: Request, data: T): ApiResponse<T> {
    return { data, meta: { correlationId: request.correlationId ?? 'unavailable' } };
  }
}

@ApiTags('media')
@Controller('artworks')
export class PublicMediaController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}

  @Get(':slug/media')
  @ApiOperation({
    operationId: 'listPublishedArtworkMedia',
    summary: 'List ready media for the exact published artwork version',
  })
  @ApiOkResponse({
    description: 'Ready derivatives and approved mockups only; originals stay private.',
  })
  async list(
    @Param('slug') slug: string,
    @Req() request: Request,
  ): Promise<ApiResponse<MediaAsset[]>> {
    return {
      data: await this.media.listPublic(slug),
      meta: { correlationId: request.correlationId ?? 'unavailable' },
    };
  }
}
