import { Controller, Get, Inject, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ApiResponse } from '@tms/contracts';
import type { Request } from 'express';

import { HealthService } from './health.service.js';
import type { HealthSnapshot } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  @Get('liveness')
  @ApiOperation({ summary: 'Confirm that the API process is alive' })
  @ApiOkResponse({ description: 'The API process is alive.' })
  liveness(@Req() request: Request): ApiResponse<HealthSnapshot> {
    return this.respond(request);
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Confirm that the API is ready to accept traffic' })
  @ApiOkResponse({ description: 'The API is ready. Dependency checks are added in B1.' })
  readiness(@Req() request: Request): ApiResponse<HealthSnapshot> {
    return this.respond(request);
  }

  private respond(request: Request): ApiResponse<HealthSnapshot> {
    return {
      data: this.healthService.getSnapshot(),
      meta: { correlationId: request.correlationId ?? 'unavailable' },
    };
  }
}
