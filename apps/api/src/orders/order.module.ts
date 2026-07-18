import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { CartModule } from '../cart/cart.module.js';
import { DatabaseService } from '../database/database.service.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { CheckoutController } from './checkout.controller.js';
import { OrderController } from './order.controller.js';
import { OrderService } from './order.service.js';

@Module({
  imports: [AuthModule, CartModule, InventoryModule],
  controllers: [CheckoutController, OrderController],
  providers: [DatabaseService, OrderService],
  // TMS-B5-001 payments drive the order state machine through OrderService.
  exports: [OrderService],
})
export class OrderModule {}
