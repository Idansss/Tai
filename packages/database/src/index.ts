import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/client/client.js';

export {
  AdminAuthChallengePurpose,
  AdminMfaFactorStatus,
  AdminProfileStatus,
  ArtworkStatus,
  ArtworkVersionStatus,
  AuthAssuranceLevel,
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

export const databasePackageStatus = 'artwork-versioning-verified' as const;
