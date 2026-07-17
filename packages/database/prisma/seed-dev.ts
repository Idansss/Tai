import { PrismaPg } from '@prisma/adapter-pg';
import { pathToFileURL } from 'node:url';

import { PrismaClient } from '../generated/client/client.js';
import { seed } from './seed.js';
import { seedCatalogue } from './seed-catalogue.js';

/**
 * Development seed: the RBAC roles/permissions from `seed.ts` plus a full browsable catalogue.
 *
 * This is deliberately separate from `prisma/seed.ts`. That file is the `prisma.config.ts` seed
 * command, which the API integration tests invoke (`prisma db seed`) and which must therefore stay
 * RBAC-only so every test starts from an empty catalogue. Only `db:seed` / `db:reset` run this
 * dev seed.
 */
export async function seedDev(): Promise<void> {
  await seed();

  const connectionString =
    process.env.DATABASE_URL ??
    'postgresql://tai:local_development_only@localhost:5432/tai_manic?schema=public';
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    await seedCatalogue(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

const invokedScript = process.argv[1];
if (invokedScript && import.meta.url === pathToFileURL(invokedScript).href) {
  await seedDev();
}
