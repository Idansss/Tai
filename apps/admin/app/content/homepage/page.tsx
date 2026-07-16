import { getHomepageEditable } from '@tms/site-content';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { HomepageView } from '@/components/content/homepage-view';
import { cms, getCmsIdentity } from '@/lib/cms/server';

export const metadata: Metadata = { title: 'Homepage' };
export const dynamic = 'force-dynamic';

export default async function HomepageContentPage() {
  const identity = await getCmsIdentity();
  if (!identity) {
    redirect('/login');
  }

  const [hero, studio] = await Promise.all([
    getHomepageEditable(cms(), 'hero'),
    getHomepageEditable(cms(), 'studio'),
  ]);

  return (
    <HomepageView
      hero={{ content: hero.content as unknown as Record<string, string>, status: hero.status }}
      studio={{
        content: studio.content as unknown as Record<string, string>,
        status: studio.status,
      }}
      permissions={identity.permissions}
    />
  );
}
