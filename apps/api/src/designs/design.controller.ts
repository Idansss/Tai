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
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { ApiResponse, DesignConfigurationSummary } from '@tms/contracts';
import type { Request, Response } from 'express';

import { SessionGuard } from '../auth/session.guard.js';
import { SaveDesignDto, UpdateDesignDto } from './design.dto.js';
import { DesignService } from './design.service.js';

@ApiTags('designs')
// The DTOs must stay value imports: under emitDecoratorMetadata a type-only import is erased
// and the ValidationPipe silently stops validating the body.
@ApiExtraModels(SaveDesignDto, UpdateDesignDto)
@ApiCookieAuth('tms_session')
@UseGuards(SessionGuard)
@Controller('designs')
export class DesignController {
  constructor(@Inject(DesignService) private readonly designs: DesignService) {}

  @Get()
  @ApiOperation({ operationId: 'listCustomerDesigns', summary: 'List the saved designs you own' })
  @ApiOkResponse({ description: 'Designs owned by the authenticated customer.' })
  async list(@Req() request: Request): Promise<ApiResponse<DesignConfigurationSummary[]>> {
    return this.respond(request, await this.designs.list(request.authSession!));
  }

  @Post()
  @ApiOperation({
    operationId: 'saveCustomerDesign',
    summary: 'Save an approved design configuration',
  })
  @ApiCreatedResponse({ description: 'The design was saved.' })
  @ApiOkResponse({ description: 'An identical design already existed and was returned.' })
  async save(
    @Body() body: SaveDesignDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponse<DesignConfigurationSummary>> {
    const result = await this.designs.save(request.authSession!, body);
    // Saving the same approved tuple twice is idempotent, so it reports 200 rather than 201.
    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return this.respond(request, result.design);
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getCustomerDesign', summary: 'Read one design you own' })
  @ApiOkResponse({ description: 'The design.' })
  async get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ): Promise<ApiResponse<DesignConfigurationSummary>> {
    return this.respond(request, await this.designs.get(request.authSession!, id));
  }

  @Patch(':id')
  @ApiOperation({
    operationId: 'updateCustomerDesign',
    summary: 'Rename a design or change its visibility',
  })
  @ApiOkResponse({ description: 'The updated design.' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateDesignDto,
    @Req() request: Request,
  ): Promise<ApiResponse<DesignConfigurationSummary>> {
    return this.respond(request, await this.designs.update(request.authSession!, id, body));
  }

  @Post(':id/share')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'rotateCustomerDesignShare',
    summary: 'Publish an unlisted share link, replacing any previous one',
  })
  @ApiOkResponse({ description: 'The design with a freshly issued share token.' })
  async rotateShare(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ): Promise<ApiResponse<DesignConfigurationSummary>> {
    return this.respond(request, await this.designs.rotateShare(request.authSession!, id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'deleteCustomerDesign', summary: 'Delete a design you own' })
  @ApiNoContentResponse({ description: 'The design was deleted.' })
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ): Promise<void> {
    await this.designs.remove(request.authSession!, id);
  }

  private respond<T>(request: Request, data: T): ApiResponse<T> {
    return { data, meta: { correlationId: request.correlationId ?? 'unavailable' } };
  }
}

@ApiTags('designs')
@Controller('shared-designs')
export class SharedDesignController {
  constructor(@Inject(DesignService) private readonly designs: DesignService) {}

  @Get(':token')
  @ApiOperation({
    operationId: 'getSharedDesign',
    summary: 'Read an unlisted design by its stable share token',
  })
  @ApiOkResponse({ description: 'The shared design; the owner and token are never disclosed.' })
  async get(
    @Param('token') token: string,
    @Req() request: Request,
  ): Promise<ApiResponse<DesignConfigurationSummary>> {
    return {
      data: await this.designs.getShared(token),
      meta: { correlationId: request.correlationId ?? 'unavailable' },
    };
  }
}
