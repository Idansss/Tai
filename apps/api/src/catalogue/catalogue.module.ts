import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';
import { DatabaseService } from '../database/database.service.js';
import { AdminCatalogueController, PublicCatalogueController } from './catalogue.controller.js';
import { CatalogueService } from './catalogue.service.js';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminCatalogueController, PublicCatalogueController],
  providers: [DatabaseService, CatalogueService],
  exports: [CatalogueService],
})
export class CatalogueModule {}
