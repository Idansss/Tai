import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { DatabaseService } from '../database/database.service.js';
import { GarmentModule } from '../garments/garment.module.js';
import { DesignController, SharedDesignController } from './design.controller.js';
import { DesignService } from './design.service.js';

@Module({
  imports: [AuthModule, GarmentModule],
  controllers: [DesignController, SharedDesignController],
  providers: [DatabaseService, DesignService],
  exports: [DesignService],
})
export class DesignModule {}
