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
  }, 300_000);

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

    expect(migrationResult.rows[0]?.count).toBe(7);
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
          'collections_status_published_at_idx',
          'drops_status_starts_at_idx',
          'stories_status_published_at_idx',
          'artwork_tags_tag_artwork_idx',
          'garment_templates_status_created_at_idx',
          'garment_variants_template_status_idx',
          'garment_placements_template_status_position_idx',
          'artwork_garment_compatibilities_template_status_idx',
          'artwork_assets_version_kind_status_idx',
          'artwork_assets_approval_kind_created_idx',
          'media_processing_jobs_status_created_idx',
          'users_normalized_email_key',
        ],
      ],
    );

    expect(result.rows.map(({ indexname }) => indexname)).toEqual([
      'admin_auth_challenges_user_state_idx',
      'artwork_assets_approval_kind_created_idx',
      'artwork_assets_version_kind_status_idx',
      'artwork_garment_compatibilities_template_status_idx',
      'artwork_tags_tag_artwork_idx',
      'artwork_versions_artwork_status_version_idx',
      'artwork_versions_one_published_idx',
      'artworks_status_created_at_idx',
      'audit_logs_correlation_id_idx',
      'audit_logs_resource_occurred_at_idx',
      'collections_status_published_at_idx',
      'drops_status_starts_at_idx',
      'email_verification_tokens_user_state_idx',
      'garment_placements_template_status_position_idx',
      'garment_templates_status_created_at_idx',
      'garment_variants_template_status_idx',
      'media_processing_jobs_status_created_idx',
      'password_reset_tokens_user_state_idx',
      'sessions_user_kind_state_idx',
      'sessions_user_revoked_expires_idx',
      'stories_status_published_at_idx',
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

  it('enforces catalogue windows, edition quantities, story ownership, and block ordering', async () => {
    const userId = randomUUID();
    const artworkId = randomUUID();
    const collectionId = randomUUID();
    const storyId = randomUUID();
    await database.query(
      `INSERT INTO users (id, email, normalized_email, updated_at)
       VALUES ($1, $2, $2, CURRENT_TIMESTAMP)`,
      [userId, `catalogue-${userId}@example.com`],
    );
    await database.query(
      `INSERT INTO artworks (id, slug, created_by_user_id, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [artworkId, `catalogue-${artworkId}`, userId],
    );
    await database.query(
      `INSERT INTO collections (id, slug, title, created_by_user_id, updated_at)
       VALUES ($1, $2, 'Constraint collection', $3, CURRENT_TIMESTAMP)`,
      [collectionId, `collection-${collectionId}`, userId],
    );

    await expectConstraint(
      database.query(
        `INSERT INTO drops
           (id, slug, title, starts_at, ends_at, created_by_user_id, updated_at)
         VALUES ($1, $2, 'Invalid window', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '1 hour', $3, CURRENT_TIMESTAMP)`,
        [randomUUID(), `drop-${randomUUID()}`, userId],
      ),
      'drops_window_check',
    );
    await expectConstraint(
      database.query(
        `INSERT INTO editions
           (id, artwork_id, name, numbered, updated_at)
         VALUES ($1, $2, 'Invalid numbered edition', true, CURRENT_TIMESTAMP)`,
        [randomUUID(), artworkId],
      ),
      'editions_numbered_check',
    );
    await expectConstraint(
      database.query(
        `INSERT INTO stories
           (id, slug, title, artwork_id, collection_id, created_by_user_id, updated_at)
         VALUES ($1, $2, 'Invalid ownership', $3, $4, $5, CURRENT_TIMESTAMP)`,
        [randomUUID(), `story-${randomUUID()}`, artworkId, collectionId, userId],
      ),
      'stories_parent_check',
    );
    await database.query(
      `INSERT INTO stories (id, slug, title, artwork_id, created_by_user_id, updated_at)
       VALUES ($1, $2, 'Ordered story', $3, $4, CURRENT_TIMESTAMP)`,
      [storyId, `ordered-${storyId}`, artworkId, userId],
    );
    await database.query(
      `INSERT INTO story_blocks (id, story_id, position, type, content)
       VALUES ($1, $2, 0, 'TEXT', '{"text":"first"}'::jsonb)`,
      [randomUUID(), storyId],
    );
    await expectConstraint(
      database.query(
        `INSERT INTO story_blocks (id, story_id, position, type, content)
         VALUES ($1, $2, 0, 'QUOTE', '{"quote":"duplicate"}'::jsonb)`,
        [randomUUID(), storyId],
      ),
      'story_blocks_story_position_key',
    );
  });

  it('enforces garment geometry, size charts, variant membership, and compatibility approval', async () => {
    const userId = randomUUID();
    const artworkId = randomUUID();
    const artworkVersionId = randomUUID();
    const firstTemplateId = randomUUID();
    const secondTemplateId = randomUUID();
    const firstSizeId = randomUUID();
    const firstColourId = randomUUID();
    const secondColourId = randomUUID();
    const secondPlacementId = randomUUID();
    const compatibilityId = randomUUID();
    await database.query(
      `INSERT INTO users (id, email, normalized_email, updated_at)
       VALUES ($1, $2, $2, CURRENT_TIMESTAMP)`,
      [userId, `garment-${userId}@example.com`],
    );
    await database.query(
      `INSERT INTO artworks (id, slug, created_by_user_id, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [artworkId, `garment-artwork-${artworkId}`, userId],
    );
    await database.query(
      `INSERT INTO artwork_versions
         (id, artwork_id, version_number, title, created_by_user_id)
       VALUES ($1, $2, 1, 'Garment constraint artwork', $3)`,
      [artworkVersionId, artworkId, userId],
    );
    for (const [id, slug] of [
      [firstTemplateId, `first-garment-${firstTemplateId}`],
      [secondTemplateId, `second-garment-${secondTemplateId}`],
    ]) {
      await database.query(
        `INSERT INTO garment_templates
           (id, slug, title, type, created_by_user_id, updated_at)
         VALUES ($1, $2, 'Constraint garment', 'CLASSIC_TSHIRT', $3, CURRENT_TIMESTAMP)`,
        [id, slug, userId],
      );
    }
    await database.query(
      `INSERT INTO garment_colours
         (id, template_id, slug, name, hex, updated_at)
       VALUES ($1, $2, 'black', 'Black', '#111111', CURRENT_TIMESTAMP),
              ($3, $4, 'white', 'White', '#FFFFFF', CURRENT_TIMESTAMP)`,
      [firstColourId, firstTemplateId, secondColourId, secondTemplateId],
    );
    await database.query(
      `INSERT INTO garment_sizes (id, template_id, code, label, updated_at)
       VALUES ($1, $2, 'M', 'Medium', CURRENT_TIMESTAMP)`,
      [firstSizeId, firstTemplateId],
    );

    await expectConstraint(
      database.query(
        `INSERT INTO garment_size_measurements (id, size_id, key, label, value_mm)
         VALUES ($1, $2, 'chest', 'Chest', 0)`,
        [randomUUID(), firstSizeId],
      ),
      'garment_size_measurements_value_check',
    );
    await expectConstraint(
      database.query(
        `INSERT INTO garment_variants
           (id, template_id, colour_id, size_id, sku, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [randomUUID(), firstTemplateId, secondColourId, firstSizeId, `SKU-${randomUUID()}`],
      ),
      'garment_variants_template_membership_check',
    );
    await expectConstraint(
      database.query(
        `INSERT INTO garment_placements
           (id, template_id, slug, name, view, x_permille, y_permille, width_permille,
            height_permille, print_width_mm, print_height_mm, updated_at)
         VALUES ($1, $2, 'outside', 'Outside', 'FRONT', 800, 100, 300, 300, 200, 200, CURRENT_TIMESTAMP)`,
        [randomUUID(), firstTemplateId],
      ),
      'garment_placements_geometry_check',
    );
    await database.query(
      `INSERT INTO garment_placements
         (id, template_id, slug, name, view, x_permille, y_permille, width_permille,
          height_permille, print_width_mm, print_height_mm, updated_at)
       VALUES ($1, $2, 'front', 'Front', 'FRONT', 100, 100, 500, 500, 250, 300, CURRENT_TIMESTAMP)`,
      [secondPlacementId, secondTemplateId],
    );
    await expectConstraint(
      database.query(
        `INSERT INTO artwork_garment_compatibilities
           (id, artwork_version_id, template_id, status, created_by_user_id, updated_at)
         VALUES ($1, $2, $3, 'APPROVED', $4, CURRENT_TIMESTAMP)`,
        [randomUUID(), artworkVersionId, firstTemplateId, userId],
      ),
      'artwork_garment_compatibilities_lifecycle_check',
    );
    await database.query(
      `INSERT INTO artwork_garment_compatibilities
         (id, artwork_version_id, template_id, created_by_user_id, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [compatibilityId, artworkVersionId, firstTemplateId, userId],
    );
    await expectConstraint(
      database.query(
        `INSERT INTO artwork_garment_placements (compatibility_id, placement_id)
         VALUES ($1, $2)`,
        [compatibilityId, secondPlacementId],
      ),
      'artwork_garment_placements_template_membership_check',
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

  it('enforces immutable exact-version media provenance and safe approval state', async () => {
    const userId = randomUUID();
    const artworkId = randomUUID();
    const versionId = randomUUID();
    const secondVersionId = randomUUID();
    const originalId = randomUUID();
    await database.query(
      `INSERT INTO users (id, email, normalized_email, updated_at)
       VALUES ($1, $2, $2, CURRENT_TIMESTAMP)`,
      [userId, `media-${userId}@example.com`],
    );
    await database.query(
      `INSERT INTO artworks (id, slug, created_by_user_id, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [artworkId, `media-${artworkId}`, userId],
    );
    await database.query(
      `INSERT INTO artwork_versions (id, artwork_id, version_number, title, created_by_user_id)
       VALUES ($1, $2, 1, 'Media one', $3), ($4, $2, 2, 'Media two', $3)`,
      [versionId, artworkId, userId, secondVersionId],
    );
    await database.query(
      `INSERT INTO artwork_assets
         (id, artwork_version_id, kind, variant_key, storage_key, original_filename, mime_type,
          extension, byte_size, width, height, checksum_sha256, processing_status,
          malware_scan_status, approval_status, created_by_user_id, updated_at)
       VALUES ($1, $2, 'ORIGINAL', 'original', $3, 'art.png', 'image/png', 'png', 2048,
               3200, 3100, $4, 'READY', 'CLEAN', 'NOT_REQUIRED', $5, CURRENT_TIMESTAMP)`,
      [originalId, versionId, `original/${originalId}.png`, 'a'.repeat(64), userId],
    );
    await expect(
      database.query('UPDATE artwork_assets SET storage_key = $1 WHERE id = $2', [
        `mutated/${originalId}.png`,
        originalId,
      ]),
    ).rejects.toThrow('media asset bytes and provenance are immutable');
    await expect(
      database.query('DELETE FROM artwork_assets WHERE id = $1', [originalId]),
    ).rejects.toThrow('media assets are immutable and cannot be deleted');
    await expect(
      database.query(
        `INSERT INTO artwork_assets
           (id, artwork_version_id, source_asset_id, kind, variant_key, storage_key,
            original_filename, mime_type, extension, byte_size, width, height,
            checksum_sha256, processing_status, malware_scan_status, approval_status,
            created_by_user_id, updated_at)
         VALUES ($1, $2, $3, 'THUMBNAIL', 'thumbnail-400', $4, 'thumb.webp',
                 'image/webp', 'webp', 512, 400, 400, $5, 'READY', 'CLEAN',
                 'NOT_REQUIRED', $6, CURRENT_TIMESTAMP)`,
        [
          randomUUID(),
          secondVersionId,
          originalId,
          `derivative/${randomUUID()}.webp`,
          'b'.repeat(64),
          userId,
        ],
      ),
    ).rejects.toThrow('media derivative source must be the same artwork version original');
    await expectConstraint(
      database.query(
        `INSERT INTO artwork_assets
           (id, artwork_version_id, kind, variant_key, storage_key, original_filename,
            mime_type, extension, byte_size, width, height, checksum_sha256,
            processing_status, malware_scan_status, approval_status, approved_at,
            created_by_user_id, updated_at)
         VALUES ($1, $2, 'ORIGINAL', 'bad-approval', $3, 'bad.png', 'image/png', 'png',
                 2048, 1000, 1000, $4, 'READY', 'CLEAN', 'APPROVED', CURRENT_TIMESTAMP,
                 $5, CURRENT_TIMESTAMP)`,
        [randomUUID(), secondVersionId, `bad/${randomUUID()}.png`, 'c'.repeat(64), userId],
      ),
      'artwork_assets_approval_check',
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
