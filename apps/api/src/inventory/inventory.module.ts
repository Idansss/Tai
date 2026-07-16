import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';
import { DatabaseService } from '../database/database.service.js';
import { AdminInventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminInventoryController],
  providers: [DatabaseService, InventoryService],
  // TMS-B4-002 carts and TMS-B4-003 checkouts consume reserve/release/commit directly.
  exports: [InventoryService],
})
export class InventoryModule {}
