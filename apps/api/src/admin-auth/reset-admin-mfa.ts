import { pathToFileURL } from 'node:url';

import { loadEnvironment } from '@tms/configuration';
import { createDatabaseClient, type DatabaseClient } from '@tms/database';

import { normalizeEmail } from '../auth/auth-crypto.js';

export async function resetAdminMfa(database: DatabaseClient, email: string): Promise<string> {
  const normalizedEmail = normalizeEmail(email);
  const user = await database.user.findUnique({
    where: { normalizedEmail },
    select: { id: true, email: true, adminProfile: { select: { userId: true } } },
  });
  if (!user?.adminProfile) throw new Error('The administrator was not found.');

  const now = new Date();
  await database.$transaction(async (transaction) => {
    await transaction.adminMfaFactor.updateMany({
      where: { userId: user.id, status: { in: ['PENDING', 'ACTIVE'] } },
      data: { status: 'REVOKED', revokedAt: now },
    });
    await transaction.adminProfile.update({
      where: { userId: user.id },
      data: { mfaEnrolledAt: null, mfaRequired: true },
    });
    await transaction.adminAuthChallenge.deleteMany({ where: { userId: user.id } });
    await transaction.session.updateMany({
      where: { userId: user.id, kind: 'ADMIN', revokedAt: null },
      data: { revokedAt: now, revocationReason: 'admin_mfa_reset' },
    });
    await transaction.auditLog.create({
      data: {
        actorType: 'SYSTEM',
        action: 'admin.mfa.reset',
        resourceType: 'admin_mfa_factor',
        resourceId: user.id,
        outcome: 'SUCCESS',
        correlationId: `admin-mfa-reset-${user.id}`,
      },
    });
  });
  return user.email;
}

async function main(): Promise<void> {
  const email = process.env.ADMIN_MFA_RESET_EMAIL;
  if (!email) throw new Error('ADMIN_MFA_RESET_EMAIL is required.');
  const environment = loadEnvironment();
  const database = createDatabaseClient(environment.DATABASE_URL);
  try {
    const resetEmail = await resetAdminMfa(database, email);
    process.stdout.write(`Reset MFA for ${resetEmail}; every admin session was revoked.\n`);
  } finally {
    await database.$disconnect();
  }
}

const invokedScript = process.argv[1];
if (invokedScript && import.meta.url === pathToFileURL(invokedScript).href) await main();
