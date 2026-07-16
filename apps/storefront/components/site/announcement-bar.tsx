import { getActiveAnnouncement, getFeatureFlags, getSiteContentClient } from '@tms/site-content';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';

type ActiveAnnouncement = {
  message: string;
  href: string | null;
  linkLabel: string | null;
  tone: 'DEFAULT' | 'INFO' | 'SUCCESS' | 'WARNING';
};

/**
 * Load the single active (published + in-window) announcement, honouring the
 * `announcementBar` feature flag. Cached with a short revalidate so the mostly
 * static storefront stays fast; fails safe to `null` if the CMS is unreachable
 * so the site never breaks on a content-layer hiccup.
 */
const loadActiveAnnouncement = unstable_cache(
  async (): Promise<ActiveAnnouncement | null> => {
    try {
      const client = getSiteContentClient();
      const flags = await getFeatureFlags(client);
      if (flags.announcementBar === false) return null;
      const active = await getActiveAnnouncement(client);
      if (!active) return null;
      return {
        message: active.message,
        href: active.href,
        linkLabel: active.linkLabel,
        tone: active.tone,
      };
    } catch (error) {
      console.error('[storefront] announcement bar unavailable', error);
      return null;
    }
  },
  ['cms:active-announcement'],
  { revalidate: 30, tags: ['cms:announcement'] },
);

const TONE_CLASS: Record<ActiveAnnouncement['tone'], string> = {
  DEFAULT: 'bg-ink text-canvas',
  INFO: 'bg-accent text-on-accent',
  SUCCESS: 'bg-[var(--color-success,#1f7a4d)] text-white',
  WARNING: 'bg-[var(--color-warning,#8a6d1a)] text-white',
};

export async function AnnouncementBar() {
  const announcement = await loadActiveAnnouncement();
  if (!announcement) return null;

  const body = (
    <span className="inline-flex flex-wrap items-center justify-center gap-x-2">
      <span>{announcement.message}</span>
      {announcement.href ? (
        <span className="font-medium underline underline-offset-2">
          {announcement.linkLabel ?? 'Learn more'}
        </span>
      ) : null}
    </span>
  );

  return (
    <div
      className={`${TONE_CLASS[announcement.tone]} px-4 py-2 text-center text-xs sm:text-sm`}
      role="region"
      aria-label="Site announcement"
    >
      {announcement.href ? (
        <Link
          href={announcement.href}
          className="outline-none focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  );
}
