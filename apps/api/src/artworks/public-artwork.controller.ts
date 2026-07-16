import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ApiResponse, Artwork, CursorPage } from '@tms/contracts';
import type { Request } from 'express';

import { ArtworkCatalogueQueryDto } from '../catalogue/catalogue.dto.js';
import { CatalogueService } from '../catalogue/catalogue.service.js';
import { ArtworkSlugDto } from './artwork.dto.js';
import { ArtworkService } from './artwork.service.js';

@ApiTags('artworks')
@ApiExtraModels(ArtworkSlugDto, ArtworkCatalogueQueryDto)
@Controller('artworks')
export class PublicArtworkController {
  constructor(
    @Inject(ArtworkService) private readonly artworkService: ArtworkService,
    @Inject(CatalogueService) private readonly catalogueService: CatalogueService,
  ) {}

  @Get()
  @ApiOperation({
    operationId: 'listPublishedArtworks',
    summary: 'List published artworks with their exact published versions',
  })
  @ApiOkResponse({ description: 'A cursor page containing only published artworks.' })
  async list(
    @Query() query: ArtworkCatalogueQueryDto,
    @Req() request: Request,
  ): Promise<ApiResponse<CursorPage<Artwork>>> {
    return this.respond(request, await this.catalogueService.searchArtworks(query));
  }

  @Get(':slug')
  @ApiOperation({ operationId: 'getPublishedArtwork', summary: 'Get a published artwork by slug' })
  @ApiOkResponse({ description: 'The artwork and its exact published version.' })
  async get(
    @Param() params: ArtworkSlugDto,
    @Req() request: Request,
  ): Promise<ApiResponse<Artwork>> {
    return this.respond(request, await this.artworkService.getPublishedArtwork(params.slug));
  }

  private respond<T>(request: Request, data: T): ApiResponse<T> {
    return { data, meta: { correlationId: request.correlationId ?? 'unavailable' } };
  }
}
