import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/client/client.js';

export {
  AdminAuthChallengePurpose,
  AdminMfaFactorStatus,
  AdminProfileStatus,
  ArtworkStatus,
  ArtworkVersionStatus,
  AuthAssuranceLevel,
  CompatibilityStatus,
  DeliveryMethod,
  DesignVisibility,
  GarmentType,
  GarmentView,
  InventoryMovementKind,
  InventoryReservationStatus,
  MalwareScanStatus,
  MediaApprovalStatus,
  MediaAssetKind,
  MediaJobStatus,
  MediaProcessingStatus,
  OrderStatus,
  PaymentStatus,
  PromotionKind,
  PromotionStatus,
  Prisma,
  SessionKind,
  StoryBlockType,
  TagKind,
  UserStatus,
} from '../generated/client/client.js';

export function createDatabaseClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export type DatabaseClient = ReturnType<typeof createDatabaseClient>;

export const databasePackageStatus = 'media-pipeline-in-progress' as const;
