import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/client/client.js';

const permissions = [
  ['system.manage', 'system', 'manage', 'Manage platform-wide settings and access.'],
  ['users.read', 'users', 'read', 'View customer and administrator accounts.'],
  ['users.write', 'users', 'write', 'Manage customer and administrator accounts.'],
  ['catalogue.read', 'catalogue', 'read', 'View catalogue administration data.'],
  ['catalogue.write', 'catalogue', 'write', 'Manage catalogue content and configuration.'],
  ['production.read', 'production', 'read', 'View production work and status.'],
  ['production.write', 'production', 'write', 'Manage production work and status.'],
  ['fulfilment.read', 'fulfilment', 'read', 'View fulfilment work and status.'],
  ['fulfilment.write', 'fulfilment', 'write', 'Manage fulfilment work and status.'],
  ['support.read', 'support', 'read', 'View customer-support operational data.'],
  ['support.write', 'support', 'write', 'Perform approved customer-support actions.'],
  ['analytics.read', 'analytics', 'read', 'View analytics and reporting data.'],
] as const;

const allPermissionCodes = permissions.map(([code]) => code);

const roles = [
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
    permissionCodes: ['fulfilment.read', 'fulfilment.write'],
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
    permissionCodes: ['analytics.read', 'catalogue.read'],
  },
] as const;

export async function seed(): Promise<void> {
  const connectionString =
    process.env.DATABASE_URL ??
    'postgresql://tai:local_development_only@localhost:5432/tai_manic?schema=public';
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    await prisma.$transaction(async (transaction) => {
      for (const [code, resource, action, description] of permissions) {
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

      for (const roleSeed of roles) {
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
    });
  } finally {
    await prisma.$disconnect();
  }
}

await seed();
