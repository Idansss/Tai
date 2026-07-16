import { execFile as execFileCallback } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const execFile = promisify(execFileCallback);
const dockerExecutable = process.platform === 'win32' ? 'docker.exe' : 'docker';
const packageDirectory = fileURLToPath(new URL('..', import.meta.url));
const prismaCli = fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url));
const containerName = `tai-manic-identity-test-${process.pid}-${randomUUID().slice(0, 8)}`;
const databaseName = 'tai_manic_identity_test';
const databaseUser = 'tai_identity_test';
const databasePassword = 'identity_test_only';

let containerStarted = false;
let databaseUrl = '';
let database: Client;

async function runDocker(arguments_: string[], timeout = 30_000): Promise<string> {
  const { stdout } = await execFile(dockerExecutable, arguments_, {
    encoding: 'utf8',
    timeout,
  });
  return stdout.trim();
}

async function waitForDocker(): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await runDocker(['info'], 15_000);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Docker is unavailable.');
}

async function waitForPostgres(): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      await runDocker(
        ['exec', containerName, 'pg_isready', '--username', databaseUser, '--dbname', databaseName],
        5_000,
      );
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  throw new Error('PostgreSQL did not become ready within 60 seconds.');
}

async function runPrisma(arguments_: string[]): Promise<void> {
  await execFile(process.execPath, [prismaCli, ...arguments_], {
    cwd: packageDirectory,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    timeout: 120_000,
  });
}

async function expectConstraint(
  operation: Promise<unknown>,
  expectedConstraint: string,
): Promise<void> {
  try {
    await operation;
  } catch (error) {
    expect(error).toMatchObject({ constraint: expectedConstraint });
    return;
  }

  throw new Error(`Expected database constraint ${expectedConstraint} to reject the operation.`);
}

describe.sequential('backend persistence PostgreSQL integration', () => {
  beforeAll(async () => {
    await waitForDocker();
    await runDocker(
      [
        'run',
        '--detach',
        '--rm',
        '--name',
        containerName,
        '--env',
        `POSTGRES_DB=${databaseName}`,
        '--env',
        `POSTGRES_USER=${databaseUser}`,
        '--env',
        `POSTGRES_PASSWORD=${databasePassword}`,
        '--publish',
        '127.0.0.1::5432',
        '--tmpfs',
        '/var/lib/postgresql/data',
        'postgres:17-alpine',
      ],
      120_000,
    );
    containerStarted = true;

    await waitForPostgres();
    const portOutput = await runDocker(['port', containerName, '5432/tcp']);
    const port = portOutput.match(/:(\d+)\s*$/m)?.[1];
    if (!port) {
      throw new Error(`Unable to determine the PostgreSQL test port from: ${portOutput}`);
    }

    databaseUrl = `postgresql://${databaseUser}:${databasePassword}@127.0.0.1:${port}/${databaseName}?schema=public`;
    await runPrisma(['generate']);
    await runPrisma(['migrate', 'deploy']);
    await runPrisma(['migrate', 'deploy']);
    await runPrisma(['db', 'seed']);
    await runPrisma(['db', 'seed']);

    database = new Client({ connectionString: databaseUrl });
    await database.connect();
  }, 180_000);

  afterAll(async () => {
    if (database) {
      await database.end();
    }
    if (containerStarted) {
      await runDocker(['rm', '--force', containerName], 30_000);
    }
  }, 45_000);

  it('deploys the reviewed migrations and seeds the canonical RBAC matrix idempotently', async () => {
    const migrationResult = await database.query<{ count: number }>(
      `SELECT count(*)::int AS count
       FROM "_prisma_migrations"
       WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
    );
    const roleResult = await database.query<{
      code: string;
      grant_count: number;
      is_system: boolean;
    }>(
      `SELECT roles.code, roles.is_system, count(role_permissions.permission_id)::int AS grant_count
       FROM roles
       LEFT JOIN role_permissions ON role_permissions.role_id = roles.id
       GROUP BY roles.id
       ORDER BY roles.code`,
    );
    const permissionResult = await database.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM permissions',
    );

    expect(migrationResult.rows[0]?.count).toBe(3);
    expect(permissionResult.rows[0]?.count).toBe(12);
    expect(roleResult.rows).toEqual([
      { code: 'ANALYST', is_system: true, grant_count: 2 },
      { code: 'CONTENT_MANAGER', is_system: true, grant_count: 2 },
      { code: 'CUSTOMER_SUPPORT', is_system: true, grant_count: 3 },
      { code: 'FULFILMENT_OPERATOR', is_system: true, grant_count: 2 },
      { code: 'OWNER', is_system: true, grant_count: 12 },
      { code: 'PRODUCTION_OPERATOR', is_system: true, grant_count: 2 },
      { code: 'STORE_ADMINISTRATOR', is_system: true, grant_count: 11 },
    ]);
  });

  it('creates the reviewed identity lookup and audit indexes', async () => {
    const result = await database.query<{ indexname: string }>(
      `SELECT indexname
       FROM pg_indexes
       WHERE schemaname = 'public'
       AND indexname = ANY($1::text[])
       ORDER BY indexname`,
      [
        [
          'audit_logs_correlation_id_idx',
          'audit_logs_resource_occurred_at_idx',
          'email_verification_tokens_user_state_idx',
          'password_reset_tokens_user_state_idx',
          'sessions_user_revoked_expires_idx',
          'sessions_user_kind_state_idx',
          'admin_auth_challenges_user_state_idx',
          'artworks_status_created_at_idx',
          'artwork_versions_artwork_status_version_idx',
          'artwork_versions_one_published_idx',
          'users_normalized_email_key',
        ],
      ],
    );

    expect(result.rows.map(({ indexname }) => indexname)).toEqual([
      'admin_auth_challenges_user_state_idx',
      'artwork_versions_artwork_status_version_idx',
      'artwork_versions_one_published_idx',
      'artworks_status_created_at_idx',
      'audit_logs_correlation_id_idx',
      'audit_logs_resource_occurred_at_idx',
      'email_verification_tokens_user_state_idx',
      'password_reset_tokens_user_state_idx',
      'sessions_user_kind_state_idx',
      'sessions_user_revoked_expires_idx',
      'users_normalized_email_key',
    ]);
  });

  it('enforces immutable artwork content, lifecycle constraints, and one published version', async () => {
    const userId = randomUUID();
    const artworkId = randomUUID();
    const versionId = randomUUID();
    await database.query(
      `INSERT INTO users (id, email, normalized_email, updated_at)
       VALUES ($1, 'artwork-owner@example.com', 'artwork-owner@example.com', CURRENT_TIMESTAMP)`,
      [userId],
    );
    await database.query(
      `INSERT INTO artworks (id, slug, created_by_user_id, updated_at)
       VALUES ($1, 'database-artwork', $2, CURRENT_TIMESTAMP)`,
      [artworkId, userId],
    );
    await database.query(
      `INSERT INTO artwork_versions
         (id, artwork_id, version_number, title, metadata, created_by_user_id)
       VALUES ($1, $2, 1, 'Original title', '{"mood":"quiet"}'::jsonb, $3)`,
      [versionId, artworkId, userId],
    );

    await expect(
      database.query('UPDATE artwork_versions SET title = $1 WHERE id = $2', [
        'Mutated title',
        versionId,
      ]),
    ).rejects.toThrow('artwork version content is immutable');
    await database.query(
      `UPDATE artwork_versions
       SET status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [versionId],
    );
    await expectConstraint(
      database.query(
        `INSERT INTO artwork_versions
           (id, artwork_id, version_number, status, title, metadata, created_by_user_id, published_at)
         VALUES ($1, $2, 2, 'PUBLISHED', 'Second title', '{}'::jsonb, $3, CURRENT_TIMESTAMP)`,
        [randomUUID(), artworkId, userId],
      ),
      'artwork_versions_one_published_idx',
    );
    await expect(
      database.query('DELETE FROM artwork_versions WHERE id = $1', [versionId]),
    ).rejects.toThrow('artwork versions are immutable and cannot be deleted');
    await expectConstraint(
      database.query(
        `INSERT INTO artworks
           (id, slug, status, created_by_user_id, updated_at)
         VALUES ($1, 'invalid-published-artwork', 'PUBLISHED', $2, CURRENT_TIMESTAMP)`,
        [randomUUID(), userId],
      ),
      'artworks_lifecycle_check',
    );
  });

  it('enforces normalized identity and lifecycle invariants in PostgreSQL', async () => {
    const userId = randomUUID();
    await database.query(
      `INSERT INTO users (id, email, normalized_email, updated_at)
       VALUES ($1, ' Identity.Test@Example.COM ', 'identity.test@example.com', CURRENT_TIMESTAMP)`,
      [userId],
    );

    await expectConstraint(
      database.query(
        `INSERT INTO users (id, email, normalized_email, updated_at)
         VALUES ($1, 'person@example.com', 'different@example.com', CURRENT_TIMESTAMP)`,
        [randomUUID()],
      ),
      'users_normalized_email_format_check',
    );
    await expectConstraint(
      database.query(
        `INSERT INTO sessions
           (id, user_id, token_hash, expires_at, last_seen_at, created_at)
         VALUES
           ($1, $2, $3, CURRENT_TIMESTAMP - INTERVAL '1 minute', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [randomUUID(), userId, `session-${randomUUID()}`],
      ),
      'sessions_expiry_check',
    );
    await expectConstraint(
      database.query(
        `INSERT INTO sessions
           (id, user_id, token_hash, expires_at, revoked_at, created_at)
         VALUES
           ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '1 hour', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [randomUUID(), userId, `session-${randomUUID()}`],
      ),
      'sessions_revocation_reason_check',
    );
    await expectConstraint(
      database.query(
        `INSERT INTO password_reset_tokens
           (id, user_id, token_hash, expires_at, consumed_at, created_at)
         VALUES
           ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '1 hour', CURRENT_TIMESTAMP + INTERVAL '2 hours', CURRENT_TIMESTAMP)`,
        [randomUUID(), userId, `reset-${randomUUID()}`],
      ),
      'password_reset_tokens_consumed_time_check',
    );
    await expectConstraint(
      database.query(
        `INSERT INTO sessions
           (id, user_id, token_hash, kind, assurance_level, expires_at, created_at)
         VALUES
           ($1, $2, $3, 'ADMIN', 'MFA', CURRENT_TIMESTAMP + INTERVAL '1 hour', CURRENT_TIMESTAMP)`,
        [randomUUID(), userId, `admin-session-${randomUUID()}`],
      ),
      'sessions_assurance_check',
    );
  });

  it('keeps audit records append-only and preserves their referenced user', async () => {
    const userId = randomUUID();
    const auditId = randomUUID();
    await database.query(
      `INSERT INTO users (id, email, normalized_email, updated_at)
       VALUES ($1, 'audit@example.com', 'audit@example.com', CURRENT_TIMESTAMP)`,
      [userId],
    );
    await database.query(
      `INSERT INTO audit_logs
         (id, actor_type, actor_user_id, action, resource_type, outcome, correlation_id)
       VALUES ($1, 'USER', $2, 'identity.test', 'user', 'SUCCESS', $3)`,
      [auditId, userId, randomUUID()],
    );

    await expect(
      database.query("UPDATE audit_logs SET outcome = 'FAILURE' WHERE id = $1", [auditId]),
    ).rejects.toThrow('audit_logs is append-only');
    await expect(database.query('DELETE FROM audit_logs WHERE id = $1', [auditId])).rejects.toThrow(
      'audit_logs is append-only',
    );
    await expectConstraint(
      database.query('DELETE FROM users WHERE id = $1', [userId]),
      'audit_logs_actor_user_id_fkey',
    );
  });
});
