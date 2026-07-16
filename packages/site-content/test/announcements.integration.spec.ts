import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  archiveAnnouncement,
  createAnnouncement,
  createSiteContentClient,
  getActiveAnnouncement,
  getAnnouncement,
  publishAnnouncement,
  restoreAnnouncement,
  softDeleteAnnouncement,
  updateAnnouncement,
  type SiteContentClient,
} from '@tms/site-content';

/**
 * Exercises the announcement lifecycle against a real `cms` schema. Runs only
 * when CMS_DATABASE_URL is set (locally / CI with the DB up); created rows are
 * hard-deleted afterwards so the suite is repeatable and non-polluting.
 */
const hasDb = Boolean(process.env.CMS_DATABASE_URL);
const actor = { id: randomUUID(), email: 'test-runner@taimanic.local' };
const created: string[] = [];
let client: SiteContentClient;

describe.skipIf(!hasDb)('announcements lifecycle', () => {
  beforeAll(() => {
    client = createSiteContentClient();
  });

  afterAll(async () => {
    if (!client) return;
    if (created.length > 0) {
      await client.auditEvent.deleteMany({ where: { resourceId: { in: created } } });
      await client.announcement.deleteMany({ where: { id: { in: created } } });
    }
    await client.$disconnect();
  });

  it('creates a draft, publishes, edits, soft-deletes and restores', async () => {
    const marker = `__TEST__ ${randomUUID()}`;

    const draft = await createAnnouncement(client, { message: marker, tone: 'INFO' }, actor);
    created.push(draft.id);
    expect(draft.status).toBe('DRAFT');
    expect(draft.publishedAt).toBeNull();

    const published = await publishAnnouncement(client, draft.id, actor);
    expect(published.status).toBe('PUBLISHED');
    expect(published.publishedAt).not.toBeNull();

    const active = await getActiveAnnouncement(client);
    expect(active?.id).toBe(draft.id);

    const edited = await updateAnnouncement(
      client,
      draft.id,
      { message: `${marker} edited`, tone: 'SUCCESS' },
      actor,
    );
    expect(edited.message).toBe(`${marker} edited`);
    expect(edited.tone).toBe('SUCCESS');

    await softDeleteAnnouncement(client, draft.id, actor);
    expect(await getAnnouncement(client, draft.id)).toBeNull();

    const restored = await restoreAnnouncement(client, draft.id, actor);
    expect(restored.status).toBe('DRAFT');
    expect(restored.deletedAt).toBeNull();

    // Audit trail recorded each step (create/publish/update/delete/restore).
    const events = await client.auditEvent.findMany({ where: { resourceId: draft.id } });
    const actions = events.map((e) => e.action).sort();
    expect(actions).toContain('announcement.create');
    expect(actions).toContain('announcement.publish');
    expect(actions).toContain('announcement.delete');
    expect(actions).toContain('announcement.restore');
  });

  it('rejects an invalid announcement (empty message)', async () => {
    await expect(createAnnouncement(client, { message: '   ' }, actor)).rejects.toThrow();
  });

  it('validates end-before-start scheduling', async () => {
    const now = Date.now();
    await expect(
      createAnnouncement(
        client,
        {
          message: `__TEST__ ${randomUUID()}`,
          startsAt: new Date(now + 10_000),
          endsAt: new Date(now + 5_000),
        },
        actor,
      ),
    ).rejects.toThrow();
  });

  it('archived announcements are not active', async () => {
    const marker = `__TEST__ ${randomUUID()}`;
    const a = await createAnnouncement(client, { message: marker }, actor);
    created.push(a.id);
    await publishAnnouncement(client, a.id, actor);
    await archiveAnnouncement(client, a.id, actor);
    const active = await getActiveAnnouncement(client);
    expect(active?.id).not.toBe(a.id);
  });
});
