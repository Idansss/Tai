import type { AdminRole } from '../generated/client/client.js';
import { createSessionToken, hashSessionToken, verifyPassword } from './auth.js';
import type { SiteContentClient } from './client.js';
import { permissionsFor, type Permission } from './rbac.js';

export const SESSION_COOKIE = 'tms_cms_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export interface AdminIdentity {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: Permission[];
}

export interface LoginResult {
  token: string;
  expiresAt: Date;
  identity: AdminIdentity;
}

/** Authenticate credentials and mint a server session. Returns null on any failure. */
export async function authenticate(
  client: SiteContentClient,
  email: string,
  password: string,
): Promise<LoginResult | null> {
  const user = await client.adminUser.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user || user.status !== 'ACTIVE' || !verifyPassword(password, user.passwordHash)) {
    return null;
  }

  const { token, tokenHash } = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await client.adminSession.create({
    data: { adminUserId: user.id, tokenHash, expiresAt },
  });
  await client.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { token, expiresAt, identity: toIdentity(user) };
}

/** Resolve the signed-in admin from a raw session token, or null. */
export async function resolveSession(
  client: SiteContentClient,
  token: string | undefined,
): Promise<AdminIdentity | null> {
  if (!token) {
    return null;
  }
  const session = await client.adminSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
    return null;
  }
  if (session.user.status !== 'ACTIVE') {
    return null;
  }
  return toIdentity(session.user);
}

export async function revokeSession(
  client: SiteContentClient,
  token: string | undefined,
): Promise<void> {
  if (!token) {
    return;
  }
  await client.adminSession.updateMany({
    where: { tokenHash: hashSessionToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

function toIdentity(user: {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}): AdminIdentity {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: permissionsFor(user.role),
  };
}
