import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseService } from '../database/database.service.js';
import { ConciergeController } from './concierge.controller.js';
import { ConciergeService } from './concierge.service.js';

@Module({
  imports: [AuthModule, AdminAuthModule],
  controllers: [ConciergeController],
  providers: [ConciergeService, DatabaseService],
  exports: [ConciergeService],
})
export class ConciergeModule {}
