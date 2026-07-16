import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/client/client.js';

/**
 * Resolve the CMS connection string. The CMS uses the `cms` Postgres schema,
 * isolated from the backend's `public` tables in the same database.
 */
export function resolveCmsConnectionString(): string {
  const url = process.env.CMS_DATABASE_URL;
  if (url && url.length > 0) {
    return url;
  }
  // Compose default; this machine maps Postgres to 5433, so set CMS_DATABASE_URL there.
  return 'postgresql://tai:local_development_only@localhost:5432/tai_manic?schema=cms';
}

/** Extract the `?schema=` search path from a connection string (defaults to `cms`). */
function schemaFrom(connectionString: string): string {
  const raw = /[?&]schema=([^&]+)/.exec(connectionString)?.[1];
  return raw ? decodeURIComponent(raw) : 'cms';
}

export function createSiteContentClient(connectionString?: string): PrismaClient {
  const url = connectionString ?? resolveCmsConnectionString();
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }, { schema: schemaFrom(url) }),
  });
}

export type SiteContentClient = ReturnType<typeof createSiteContentClient>;

/**
 * Process-wide singleton so Next.js hot reloads and route handlers share one
 * pool. Mirrors the standard Prisma-in-Next.js pattern.
 */
const globalForCms = globalThis as unknown as { __tmsSiteContent?: SiteContentClient };

export function getSiteContentClient(): SiteContentClient {
  if (!globalForCms.__tmsSiteContent) {
    globalForCms.__tmsSiteContent = createSiteContentClient();
  }
  return globalForCms.__tmsSiteContent;
}
