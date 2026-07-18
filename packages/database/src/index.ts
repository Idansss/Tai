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

/**
 * The `pg` driver adapter does not read `?schema=` from the connection string — only Prisma's
 * migration engine does. So without this, migrations land in (say) Supabase's `tai` schema while
 * every runtime query defaults to `public` and fails with "table does not exist". Read the schema
 * back off the URL and hand it to the adapter so migrate and runtime agree. Undefined (no
 * `?schema=`) keeps the adapter's default `public`, so local/test behaviour is unchanged.
 */
export function schemaFromConnectionString(connectionString: string): string | undefined {
  try {
    return new URL(connectionString).searchParams.get('schema') ?? undefined;
  } catch {
    return undefined;
  }
}

export function createDatabaseClient(connectionString: string): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg(
      { connectionString },
      { schema: schemaFromConnectionString(connectionString) },
    ),
  });
}

export type DatabaseClient = ReturnType<typeof createDatabaseClient>;

export const databasePackageStatus = 'media-pipeline-in-progress' as const;
