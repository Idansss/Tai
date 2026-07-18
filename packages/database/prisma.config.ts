import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'prisma/config';

// Prisma stops auto-loading `.env` once a prisma.config.ts exists, so load the monorepo-root file
// ourselves before reading DATABASE_URL below. Kept inline (no workspace import) because the Prisma
// CLI evaluates this config early, in its own context. Existing env wins; a missing file is a no-op.
const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '../..', '.env');
if (existsSync(envPath)) process.loadEnvFile(envPath);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://tai:local_development_only@localhost:5432/tai_manic?schema=public',
  },
});
