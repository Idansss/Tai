import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';
import { DatabaseService } from '../database/database.service.js';
import { AdminGarmentController, PublicGarmentController } from './garment.controller.js';
import { GarmentService } from './garment.service.js';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminGarmentController, PublicGarmentController],
  providers: [DatabaseService, GarmentService],
  exports: [GarmentService],
})
export class GarmentModule {}
