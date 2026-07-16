import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { DatabaseService } from '../database/database.service.js';
import { GarmentModule } from '../garments/garment.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';

@Module({
  imports: [AuthModule, GarmentModule, InventoryModule],
  controllers: [CartController],
  providers: [DatabaseService, CartService],
  // TMS-B4-003 checkout consumes the cart and takes the inventory hold.
  exports: [CartService],
})
export class CartModule {}
