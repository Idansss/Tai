// @tms/site-content — frontend-owned CMS persistence + services.
// Consumed by apps/admin (writes) and apps/storefront (reads).

export {
  createSiteContentClient,
  getSiteContentClient,
  resolveCmsConnectionString,
  type SiteContentClient,
} from './client.js';

export {
  Prisma,
  type AdminRole,
  type AdminUserStatus,
  type Announcement,
  type AnnouncementTone,
  type ContentStatus,
  type ContentPage,
  type HomepageSection,
  type NavGroup,
  type NavLink,
  type Redirect,
  type SeoEntry,
  type SiteSetting,
  type StudioGuideEntry,
  type StudioGuideKind,
  type MediaAsset,
} from '../generated/client/client.js';

export * from './auth.js';
export * from './rbac.js';
export * from './audit.js';
export * from './session.js';
export * from './errors.js';
export * from './announcements.js';
export * from './homepage.js';
export * from './settings.js';

export const siteContentPackageStatus = 'cms-foundation-v1' as const;
