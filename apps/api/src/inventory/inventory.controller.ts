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
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { ApiResponse } from '@tms/contracts';
import type { Request } from 'express';

import { RequireAdminPermissions } from '../admin-auth/admin-authorization.js';
import { AdminPermissionGuard } from '../admin-auth/admin-permission.guard.js';
import { AdminSessionGuard } from '../admin-auth/admin-session.guard.js';
import {
  InventoryAdjustmentDto,
  InventoryListQueryDto,
  InventoryReceiptDto,
  InventoryThresholdDto,
} from './inventory.dto.js';
import { InventoryService, type StockLevel } from './inventory.service.js';

@ApiTags('administrator-inventory')
// Value imports: under emitDecoratorMetadata a type-only import is erased and the
// ValidationPipe silently stops validating the body.
@ApiExtraModels(
  InventoryReceiptDto,
  InventoryAdjustmentDto,
  InventoryThresholdDto,
  InventoryListQueryDto,
)
@ApiCookieAuth('tms_admin_session')
@UseGuards(AdminSessionGuard, AdminPermissionGuard)
@Controller('admin/inventory')
export class AdminInventoryController {
  constructor(@Inject(InventoryService) private readonly inventory: InventoryService) {}

  @Get()
  @RequireAdminPermissions('inventory.read')
  @ApiOperation({ operationId: 'listAdministratorStock', summary: 'List stock levels' })
  @ApiOkResponse({ description: 'Stock levels per garment variant.' })
  async list(
    @Query() query: InventoryListQueryDto,
    @Req() request: Request,
  ): Promise<ApiResponse<StockLevel[]>> {
    return this.respond(request, await this.inventory.listLevels(query.lowStockOnly ?? false));
  }

  @Get(':variantId')
  @RequireAdminPermissions('inventory.read')
  @ApiOperation({ operationId: 'getAdministratorStock', summary: 'Read one variant stock level' })
  @ApiOkResponse({ description: 'The stock level.' })
  async get(
    @Param('variantId', new ParseUUIDPipe()) variantId: string,
    @Req() request: Request,
  ): Promise<ApiResponse<StockLevel>> {
    return this.respond(request, await this.inventory.getLevel(variantId));
  }

  @Get(':variantId/movements')
  @RequireAdminPermissions('inventory.read')
  @ApiOperation({
    operationId: 'listAdministratorStockMovements',
    summary: 'Read the append-only stock ledger',
  })
  @ApiOkResponse({ description: 'Every movement, oldest first. The ledger is never rewritten.' })
  async movements(
    @Param('variantId', new ParseUUIDPipe()) variantId: string,
    @Req() request: Request,
  ): Promise<ApiResponse<unknown>> {
    return this.respond(request, await this.inventory.listMovements(variantId));
  }

  @Post(':variantId/receipts')
  @HttpCode(HttpStatus.OK)
  @RequireAdminPermissions('inventory.write')
  @ApiOperation({ operationId: 'receiveAdministratorStock', summary: 'Receive stock' })
  @ApiOkResponse({ description: 'The updated stock level.' })
  async receive(
    @Param('variantId', new ParseUUIDPipe()) variantId: string,
    @Body() body: InventoryReceiptDto,
    @Req() request: Request,
  ): Promise<ApiResponse<StockLevel>> {
    return this.respond(
      request,
      await this.inventory.receive(request.adminSession!, variantId, body, this.context(request)),
    );
  }

  @Post(':variantId/adjustments')
  @HttpCode(HttpStatus.OK)
  @RequireAdminPermissions('inventory.write')
  @ApiOperation({
    operationId: 'adjustAdministratorStock',
    summary: 'Adjust stock with a recorded reason',
  })
  @ApiOkResponse({ description: 'The updated stock level.' })
  async adjust(
    @Param('variantId', new ParseUUIDPipe()) variantId: string,
    @Body() body: InventoryAdjustmentDto,
    @Req() request: Request,
  ): Promise<ApiResponse<StockLevel>> {
    return this.respond(
      request,
      await this.inventory.adjust(request.adminSession!, variantId, body, this.context(request)),
    );
  }

  @Put(':variantId/threshold')
  @RequireAdminPermissions('inventory.write')
  @ApiOperation({
    operationId: 'setAdministratorStockThreshold',
    summary: 'Set the low-stock alert threshold',
  })
  @ApiOkResponse({ description: 'The updated stock level.' })
  async threshold(
    @Param('variantId', new ParseUUIDPipe()) variantId: string,
    @Body() body: InventoryThresholdDto,
    @Req() request: Request,
  ): Promise<ApiResponse<StockLevel>> {
    return this.respond(
      request,
      await this.inventory.setThreshold(
        request.adminSession!,
        variantId,
        body,
        this.context(request),
      ),
    );
  }

  private context(request: Request) {
    return { correlationId: request.correlationId ?? 'unavailable' };
  }

  private respond<T>(request: Request, data: T): ApiResponse<T> {
    return { data, meta: { correlationId: request.correlationId ?? 'unavailable' } };
  }
}
