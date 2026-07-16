import type { Announcement } from '@tms/site-content';

/** JSON-safe announcement shape sent to client components (Dates → ISO strings). */
export interface AnnouncementDTO {
  id: string;
  message: string;
  href: string | null;
  linkLabel: string | null;
  tone: 'DEFAULT' | 'INFO' | 'SUCCESS' | 'WARNING';
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
  publishedAt: string | null;
  deletedAt: string | null;
  updatedAt: string;
}

export function toAnnouncementDTO(a: Announcement): AnnouncementDTO {
  return {
    id: a.id,
    message: a.message,
    href: a.href,
    linkLabel: a.linkLabel,
    tone: a.tone,
    status: a.status,
    startsAt: a.startsAt ? a.startsAt.toISOString() : null,
    endsAt: a.endsAt ? a.endsAt.toISOString() : null,
    sortOrder: a.sortOrder,
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
    deletedAt: a.deletedAt ? a.deletedAt.toISOString() : null,
    updatedAt: a.updatedAt.toISOString(),
  };
}
