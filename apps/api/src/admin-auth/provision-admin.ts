import { pathToFileURL } from 'node:url';

import { loadEnvironment } from '@tms/configuration';
import { CustomerLoginInputSchema } from '@tms/contracts';
import { createDatabaseClient, type DatabaseClient } from '@tms/database';

import { hashPassword, normalizeEmail } from '../auth/auth-crypto.js';

export interface ProvisionAdminInput {
  email: string;
  password: string;
  displayName: string;
  roleCode: string;
  mfaRequired: boolean;
}

export async function provisionAdmin(
  database: DatabaseClient,
  input: ProvisionAdminInput,
): Promise<{ id: string; email: string; roleCode: string }> {
  const parsedLogin = CustomerLoginInputSchema.safeParse({
    email: input.email,
    password: input.password,
  });
  const displayName = input.displayName.trim();
  const roleCode = input.roleCode.trim().toUpperCase();
  if (
    !parsedLogin.success ||
    input.password.length < 12 ||
    !displayName ||
    displayName.length > 100
  ) {
    throw new Error('Provide a valid email, a 12–128 character password, and a display name.');
  }
  if (!/^[A-Z][A-Z0-9_]{0,63}$/u.test(roleCode)) throw new Error('Invalid role code.');

  const normalizedEmail = normalizeEmail(parsedLogin.data.email);
  const passwordHash = await hashPassword(parsedLogin.data.password);
  return database.$transaction(async (transaction) => {
    const [existing, role] = await Promise.all([
      transaction.user.findUnique({ where: { normalizedEmail } }),
      transaction.role.findUnique({ where: { code: roleCode } }),
    ]);
    if (existing) throw new Error('A user already exists for this email address.');
    if (!role) throw new Error(`The role ${roleCode} does not exist; run the database seed first.`);

    const now = new Date();
    const user = await transaction.user.create({
      data: {
        email: normalizedEmail,
        normalizedEmail,
        passwordHash,
        status: 'ACTIVE',
        emailVerifiedAt: now,
        adminProfile: {
          create: {
            displayName,
            status: 'ACTIVE',
            mfaRequired: input.mfaRequired,
          },
        },
        roleAssignments: { create: { roleId: role.id } },
      },
    });
    await transaction.auditLog.create({
      data: {
        actorType: 'SYSTEM',
        action: 'admin.provision',
        resourceType: 'user',
        resourceId: user.id,
        outcome: 'SUCCESS',
        correlationId: `admin-provision-${user.id}`,
        metadata: { roleCode, mfaRequired: input.mfaRequired },
      },
    });
    return { id: user.id, email: normalizedEmail, roleCode };
  });
}

async function main(): Promise<void> {
  const email = process.env.ADMIN_PROVISION_EMAIL;
  const password = process.env.ADMIN_PROVISION_PASSWORD;
  const displayName = process.env.ADMIN_PROVISION_NAME;
  if (!email || !password || !displayName) {
    throw new Error(
      'ADMIN_PROVISION_EMAIL, ADMIN_PROVISION_PASSWORD, and ADMIN_PROVISION_NAME are required.',
    );
  }
  const environment = loadEnvironment();
  const database = createDatabaseClient(environment.DATABASE_URL);
  try {
    const result = await provisionAdmin(database, {
      email,
      password,
      displayName,
      roleCode: process.env.ADMIN_PROVISION_ROLE ?? 'OWNER',
      mfaRequired: process.env.ADMIN_PROVISION_MFA_REQUIRED !== 'false',
    });
    process.stdout.write(`Provisioned ${result.email} as ${result.roleCode} (${result.id}).\n`);
  } finally {
    await database.$disconnect();
  }
}

const invokedScript = process.argv[1];
if (invokedScript && import.meta.url === pathToFileURL(invokedScript).href) await main();
