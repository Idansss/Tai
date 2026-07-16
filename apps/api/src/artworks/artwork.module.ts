import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';
import { DatabaseService } from '../database/database.service.js';
import { AdminArtworkController } from './admin-artwork.controller.js';
import { ArtworkService } from './artwork.service.js';
import { PublicArtworkController } from './public-artwork.controller.js';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminArtworkController, PublicArtworkController],
  providers: [DatabaseService, ArtworkService],
})
export class ArtworkModule {}
