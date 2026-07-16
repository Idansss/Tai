import { defineConfig } from 'prisma/config';

/**
 * The CMS lives in the `cms` Postgres schema, isolated from the backend's
 * `public` tables inside the same database. Override with CMS_DATABASE_URL
 * (this machine maps Postgres to host port 5433; the compose default is 5432).
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url:
      process.env.CMS_DATABASE_URL ??
      'postgresql://tai:local_development_only@localhost:5432/tai_manic?schema=cms',
  },
});
