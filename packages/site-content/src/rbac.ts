import type { AdminRole } from '../generated/client/client.js';

/**
 * Server-side permission model for the CMS. Every mutating route handler checks
 * `can(role, permission)` before touching data; the UI only hides what the
 * server also refuses. Ultimately superseded by Codex's granular RBAC (B1-003),
 * which the admin will consult over `/api/v1/admin/auth/session`.
 */
export type Permission =
  | 'content.read'
  | 'content.write'
  | 'content.publish'
  | 'content.delete'
  | 'settings.read'
  | 'settings.write'
  | 'staff.read'
  | 'staff.write'
  | 'audit.read'
  | 'media.write';

const ROLE_PERMISSIONS: Record<AdminRole, ReadonlySet<Permission>> = {
  OWNER: new Set<Permission>([
    'content.read',
    'content.write',
    'content.publish',
    'content.delete',
    'settings.read',
    'settings.write',
    'staff.read',
    'staff.write',
    'audit.read',
    'media.write',
  ]),
  ADMINISTRATOR: new Set<Permission>([
    'content.read',
    'content.write',
    'content.publish',
    'content.delete',
    'settings.read',
    'settings.write',
    'staff.read',
    'audit.read',
    'media.write',
  ]),
  RESTRICTED_STAFF: new Set<Permission>(['content.read', 'content.write', 'media.write']),
};

export function can(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export function permissionsFor(role: AdminRole): Permission[] {
  return [...(ROLE_PERMISSIONS[role] ?? new Set<Permission>())];
}

export class PermissionDeniedError extends Error {
  constructor(public readonly permission: Permission) {
    super(`Permission denied: ${permission}`);
    this.name = 'PermissionDeniedError';
  }
}

export function assertCan(role: AdminRole, permission: Permission): void {
  if (!can(role, permission)) {
    throw new PermissionDeniedError(permission);
  }
}
