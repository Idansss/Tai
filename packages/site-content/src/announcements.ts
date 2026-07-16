import type {
  Announcement,
  AnnouncementTone,
  ContentStatus,
  Prisma,
} from '../generated/client/client.js';
import { recordAudit, type AuditActor } from './audit.js';
import type { SiteContentClient } from './client.js';
import { NotFoundError, ValidationError } from './errors.js';

export interface AnnouncementInput {
  message: string;
  href?: string | null;
  linkLabel?: string | null;
  tone?: AnnouncementTone;
  startsAt?: Date | null;
  endsAt?: Date | null;
  sortOrder?: number;
}

export interface ListAnnouncementParams {
  status?: ContentStatus | 'all';
  query?: string;
  includeDeleted?: boolean;
  page?: number;
  pageSize?: number;
}

const TONES: AnnouncementTone[] = ['DEFAULT', 'INFO', 'SUCCESS', 'WARNING'];

function validate(input: AnnouncementInput): void {
  const fieldErrors: Record<string, string> = {};
  const message = input.message?.trim() ?? '';
  if (message.length === 0) {
    fieldErrors.message = 'A message is required.';
  } else if (message.length > 280) {
    fieldErrors.message = 'Keep the message under 280 characters.';
  }
  if (input.href && input.href.trim().length > 0 && !/^(https?:\/\/|\/)/.test(input.href.trim())) {
    fieldErrors.href = 'Link must be an absolute URL or a site path starting with "/".';
  }
  if (
    input.linkLabel &&
    input.linkLabel.trim().length > 0 &&
    (!input.href || input.href.trim().length === 0)
  ) {
    fieldErrors.linkLabel = 'Add a link URL to use a link label.';
  }
  if (input.tone && !TONES.includes(input.tone)) {
    fieldErrors.tone = 'Unknown tone.';
  }
  if (input.startsAt && input.endsAt && input.endsAt.getTime() <= input.startsAt.getTime()) {
    fieldErrors.endsAt = 'End time must be after the start time.';
  }
  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError('Announcement is invalid.', fieldErrors);
  }
}

function normalise(input: AnnouncementInput) {
  return {
    message: input.message.trim(),
    href: input.href?.trim() || null,
    linkLabel: input.linkLabel?.trim() || null,
    tone: input.tone ?? 'DEFAULT',
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
  };
}

export async function listAnnouncements(
  client: SiteContentClient,
  params: ListAnnouncementParams = {},
): Promise<{ items: Announcement[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const where: Prisma.AnnouncementWhereInput = {
    deletedAt: params.includeDeleted ? undefined : null,
  };
  if (params.status && params.status !== 'all') {
    where.status = params.status;
  }
  if (params.query && params.query.trim().length > 0) {
    where.message = { contains: params.query.trim(), mode: 'insensitive' };
  }
  const [items, total] = await Promise.all([
    client.announcement.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    client.announcement.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

/** The single announcement to show publicly right now (published + in window). */
export async function getActiveAnnouncement(
  client: SiteContentClient,
): Promise<Announcement | null> {
  const now = new Date();
  const items = await client.announcement.findMany({
    where: {
      deletedAt: null,
      status: 'PUBLISHED',
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
    },
    orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
    take: 1,
  });
  return items[0] ?? null;
}

export async function getAnnouncement(
  client: SiteContentClient,
  id: string,
): Promise<Announcement | null> {
  return client.announcement.findFirst({ where: { id, deletedAt: null } });
}

export async function createAnnouncement(
  client: SiteContentClient,
  input: AnnouncementInput,
  actor: AuditActor,
): Promise<Announcement> {
  validate(input);
  const data = normalise(input);
  const created = await client.announcement.create({
    data: {
      ...data,
      sortOrder: input.sortOrder ?? 0,
      createdById: actor.id,
      updatedById: actor.id,
    },
  });
  await recordAudit(client, {
    actor,
    action: 'announcement.create',
    resourceType: 'announcement',
    resourceId: created.id,
    summary: `Created announcement "${truncate(created.message)}"`,
    after: created,
  });
  return created;
}

export async function updateAnnouncement(
  client: SiteContentClient,
  id: string,
  input: AnnouncementInput,
  actor: AuditActor,
): Promise<Announcement> {
  const before = await requireAnnouncement(client, id);
  validate(input);
  const data = normalise(input);
  const updated = await client.announcement.update({
    where: { id },
    data: { ...data, sortOrder: input.sortOrder ?? before.sortOrder, updatedById: actor.id },
  });
  await recordAudit(client, {
    actor,
    action: 'announcement.update',
    resourceType: 'announcement',
    resourceId: id,
    summary: `Updated announcement "${truncate(updated.message)}"`,
    before,
    after: updated,
  });
  return updated;
}

async function transition(
  client: SiteContentClient,
  id: string,
  status: ContentStatus,
  actor: AuditActor,
  action: string,
): Promise<Announcement> {
  const before = await requireAnnouncement(client, id);
  const updated = await client.announcement.update({
    where: { id },
    data: {
      status,
      publishedAt: status === 'PUBLISHED' ? (before.publishedAt ?? new Date()) : before.publishedAt,
      updatedById: actor.id,
    },
  });
  await recordAudit(client, {
    actor,
    action,
    resourceType: 'announcement',
    resourceId: id,
    summary: `${action} for "${truncate(updated.message)}"`,
    before,
    after: updated,
  });
  return updated;
}

export const publishAnnouncement = (c: SiteContentClient, id: string, a: AuditActor) =>
  transition(c, id, 'PUBLISHED', a, 'announcement.publish');
export const unpublishAnnouncement = (c: SiteContentClient, id: string, a: AuditActor) =>
  transition(c, id, 'DRAFT', a, 'announcement.unpublish');
export const archiveAnnouncement = (c: SiteContentClient, id: string, a: AuditActor) =>
  transition(c, id, 'ARCHIVED', a, 'announcement.archive');

export async function reorderAnnouncements(
  client: SiteContentClient,
  orderedIds: string[],
  actor: AuditActor,
): Promise<void> {
  await client.$transaction(
    orderedIds.map((id, index) =>
      client.announcement.update({
        where: { id },
        data: { sortOrder: index, updatedById: actor.id },
      }),
    ),
  );
  await recordAudit(client, {
    actor,
    action: 'announcement.reorder',
    resourceType: 'announcement',
    summary: `Reordered ${orderedIds.length} announcements`,
    after: orderedIds,
  });
}

export async function softDeleteAnnouncement(
  client: SiteContentClient,
  id: string,
  actor: AuditActor,
): Promise<void> {
  const before = await requireAnnouncement(client, id);
  await client.announcement.update({
    where: { id },
    data: { deletedAt: new Date(), status: 'ARCHIVED', updatedById: actor.id },
  });
  await recordAudit(client, {
    actor,
    action: 'announcement.delete',
    resourceType: 'announcement',
    resourceId: id,
    summary: `Deleted announcement "${truncate(before.message)}"`,
    before,
  });
}

export async function restoreAnnouncement(
  client: SiteContentClient,
  id: string,
  actor: AuditActor,
): Promise<Announcement> {
  const existing = await client.announcement.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Announcement', id);
  }
  const restored = await client.announcement.update({
    where: { id },
    data: { deletedAt: null, status: 'DRAFT', updatedById: actor.id },
  });
  await recordAudit(client, {
    actor,
    action: 'announcement.restore',
    resourceType: 'announcement',
    resourceId: id,
    summary: `Restored announcement "${truncate(restored.message)}"`,
    after: restored,
  });
  return restored;
}

async function requireAnnouncement(client: SiteContentClient, id: string): Promise<Announcement> {
  const existing = await client.announcement.findFirst({ where: { id, deletedAt: null } });
  if (!existing) {
    throw new NotFoundError('Announcement', id);
  }
  return existing;
}

function truncate(value: string, max = 60): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
