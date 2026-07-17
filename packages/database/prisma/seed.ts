import { PrismaPg } from '@prisma/adapter-pg';
import { pathToFileURL } from 'node:url';

import { PrismaClient } from '../generated/client/client.js';
import { seedCatalogue } from './seed-catalogue.js';

export const permissionSeeds = [
  ['system.manage', 'system', 'manage', 'Manage platform-wide settings and access.'],
  ['users.read', 'users', 'read', 'View customer and administrator accounts.'],
  ['users.write', 'users', 'write', 'Manage customer and administrator accounts.'],
  ['catalogue.read', 'catalogue', 'read', 'View catalogue administration data.'],
  ['catalogue.write', 'catalogue', 'write', 'Manage catalogue content and configuration.'],
  ['inventory.read', 'inventory', 'read', 'View garment stock levels and movements.'],
  ['inventory.write', 'inventory', 'write', 'Receive, adjust, and correct garment stock.'],
  ['production.read', 'production', 'read', 'View production work and status.'],
  ['production.write', 'production', 'write', 'Manage production work and status.'],
  ['fulfilment.read', 'fulfilment', 'read', 'View fulfilment work and status.'],
  ['fulfilment.write', 'fulfilment', 'write', 'Manage fulfilment work and status.'],
  ['support.read', 'support', 'read', 'View customer-support operational data.'],
  ['support.write', 'support', 'write', 'Perform approved customer-support actions.'],
  ['analytics.read', 'analytics', 'read', 'View analytics and reporting data.'],
] as const;

const allPermissionCodes = permissionSeeds.map(([code]) => code);

export const roleSeeds = [
  {
    code: 'OWNER',
    name: 'Owner',
    description: 'Full platform authority.',
    permissionCodes: allPermissionCodes,
  },
  {
    code: 'STORE_ADMINISTRATOR',
    name: 'Store Administrator',
    description: 'Day-to-day store administration without owner-only system authority.',
    permissionCodes: allPermissionCodes.filter((code) => code !== 'system.manage'),
  },
  {
    code: 'CONTENT_MANAGER',
    name: 'Content Manager',
    description: 'Catalogue and editorial content administration.',
    permissionCodes: ['catalogue.read', 'catalogue.write'],
  },
  {
    code: 'PRODUCTION_OPERATOR',
    name: 'Production Operator',
    description: 'Production queue and print workflow operations.',
    permissionCodes: ['production.read', 'production.write'],
  },
  {
    code: 'FULFILMENT_OPERATOR',
    name: 'Fulfilment Operator',
    description: 'Packing, dispatch, and fulfilment operations.',
    permissionCodes: ['fulfilment.read', 'fulfilment.write', 'inventory.read', 'inventory.write'],
  },
  {
    code: 'CUSTOMER_SUPPORT',
    name: 'Customer Support',
    description: 'Customer support with scoped account visibility and actions.',
    permissionCodes: ['users.read', 'support.read', 'support.write'],
  },
  {
    code: 'ANALYST',
    name: 'Analyst',
    description: 'Read-only analytics and catalogue visibility.',
    permissionCodes: ['analytics.read', 'catalogue.read', 'inventory.read'],
  },
] as const;

export async function seed(): Promise<void> {
  const connectionString =
    process.env.DATABASE_URL ??
    'postgresql://tai:local_development_only@localhost:5432/tai_manic?schema=public';
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    await prisma.$transaction(
      async (transaction) => {
        for (const [code, resource, action, description] of permissionSeeds) {
          await transaction.permission.upsert({
            where: { code },
            update: { resource, action, description },
            create: { code, resource, action, description },
          });
        }

        const permissionRecords = await transaction.permission.findMany({
          where: { code: { in: [...allPermissionCodes] } },
          select: { id: true, code: true },
        });
        const permissionIds = new Map(permissionRecords.map(({ code, id }) => [code, id]));

        for (const roleSeed of roleSeeds) {
          const role = await transaction.role.upsert({
            where: { code: roleSeed.code },
            update: { name: roleSeed.name, description: roleSeed.description, isSystem: true },
            create: { code: roleSeed.code, name: roleSeed.name, description: roleSeed.description },
            select: { id: true },
          });

          await transaction.rolePermission.deleteMany({ where: { roleId: role.id } });
          await transaction.rolePermission.createMany({
            data: roleSeed.permissionCodes.map((permissionCode) => {
              const permissionId = permissionIds.get(permissionCode);
              if (!permissionId) {
                throw new Error(`Missing seeded permission: ${permissionCode}`);
              }
              return { roleId: role.id, permissionId };
            }),
          });
        }
      },
      { maxWait: 30_000, timeout: 60_000 },
    );

    // Development catalogue: artworks, garments, approved priced pairs, inventory, promotions.
    // Idempotent and safe to re-run; kept outside the RBAC transaction so a large catalogue seed
    // does not hold a single long transaction open.
    if (process.env.TMS_SEED_CATALOGUE !== 'false') {
      await seedCatalogue(prisma);
    }
  } finally {
    await prisma.$disconnect();
  }
}

const invokedScript = process.argv[1];
if (invokedScript && import.meta.url === pathToFileURL(invokedScript).href) {
  await seed();
}
