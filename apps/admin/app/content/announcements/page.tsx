import { listAnnouncements } from '@tms/site-content';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AnnouncementsView } from '@/components/content/announcements-view';
import { toAnnouncementDTO } from '@/lib/cms/announcement-dto';
import { cms, getCmsIdentity } from '@/lib/cms/server';

export const metadata: Metadata = { title: 'Announcements' };
export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage() {
  const identity = await getCmsIdentity();
  if (!identity) {
    redirect('/login');
  }

  const { items } = await listAnnouncements(cms(), {
    status: 'all',
    includeDeleted: true,
    pageSize: 100,
  });

  return (
    <AnnouncementsView
      initialItems={items.map(toAnnouncementDTO)}
      permissions={identity.permissions}
    />
  );
}
