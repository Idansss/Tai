CREATE TYPE "ArtworkStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ArtworkVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "artworks" (
  "id" UUID NOT NULL,
  "slug" VARCHAR(160) NOT NULL,
  "status" "ArtworkStatus" NOT NULL DEFAULT 'DRAFT',
  "created_by_user_id" UUID NOT NULL,
  "published_at" TIMESTAMPTZ(3),
  "archived_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "artworks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "artworks_slug_format_check"
    CHECK ("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT "artworks_lifecycle_check"
    CHECK (
      ("status" = 'DRAFT' AND "published_at" IS NULL AND "archived_at" IS NULL)
      OR ("status" = 'PUBLISHED' AND "published_at" IS NOT NULL AND "archived_at" IS NULL)
      OR ("status" = 'ARCHIVED' AND "archived_at" IS NOT NULL)
    ),
  CONSTRAINT "artworks_timestamps_check"
    CHECK (
      ("published_at" IS NULL OR "published_at" >= "created_at")
      AND ("archived_at" IS NULL OR "archived_at" >= "created_at")
    )
);

CREATE TABLE "artwork_versions" (
  "id" UUID NOT NULL,
  "artwork_id" UUID NOT NULL,
  "version_number" INTEGER NOT NULL,
  "status" "ArtworkVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "title" VARCHAR(200) NOT NULL,
  "short_story" VARCHAR(500),
  "story" TEXT,
  "inspiration" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_by_user_id" UUID NOT NULL,
  "published_at" TIMESTAMPTZ(3),
  "archived_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "artwork_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "artwork_versions_number_check" CHECK ("version_number" > 0),
  CONSTRAINT "artwork_versions_title_check" CHECK (length(btrim("title")) > 0),
  CONSTRAINT "artwork_versions_lifecycle_check"
    CHECK (
      ("status" = 'DRAFT' AND "published_at" IS NULL AND "archived_at" IS NULL)
      OR ("status" = 'PUBLISHED' AND "published_at" IS NOT NULL AND "archived_at" IS NULL)
      OR ("status" = 'ARCHIVED' AND "archived_at" IS NOT NULL)
    ),
  CONSTRAINT "artwork_versions_timestamps_check"
    CHECK (
      ("published_at" IS NULL OR "published_at" >= "created_at")
      AND ("archived_at" IS NULL OR "archived_at" >= "created_at")
    )
);

CREATE UNIQUE INDEX "artworks_slug_key" ON "artworks"("slug");
CREATE INDEX "artworks_status_created_at_idx" ON "artworks"("status", "created_at");
CREATE INDEX "artworks_created_by_user_id_idx" ON "artworks"("created_by_user_id");
CREATE UNIQUE INDEX "artwork_versions_artwork_version_key"
  ON "artwork_versions"("artwork_id", "version_number");
CREATE UNIQUE INDEX "artwork_versions_one_published_idx"
  ON "artwork_versions"("artwork_id") WHERE "status" = 'PUBLISHED';
CREATE INDEX "artwork_versions_artwork_status_version_idx"
  ON "artwork_versions"("artwork_id", "status", "version_number");
CREATE INDEX "artwork_versions_status_published_at_idx"
  ON "artwork_versions"("status", "published_at");
CREATE INDEX "artwork_versions_created_by_user_id_idx"
  ON "artwork_versions"("created_by_user_id");

ALTER TABLE "artworks"
  ADD CONSTRAINT "artworks_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "artwork_versions"
  ADD CONSTRAINT "artwork_versions_artwork_id_fkey"
  FOREIGN KEY ("artwork_id") REFERENCES "artworks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "artwork_versions"
  ADD CONSTRAINT "artwork_versions_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_artwork_version_content_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."artwork_id" IS DISTINCT FROM OLD."artwork_id"
    OR NEW."version_number" IS DISTINCT FROM OLD."version_number"
    OR NEW."title" IS DISTINCT FROM OLD."title"
    OR NEW."short_story" IS DISTINCT FROM OLD."short_story"
    OR NEW."story" IS DISTINCT FROM OLD."story"
    OR NEW."inspiration" IS DISTINCT FROM OLD."inspiration"
    OR NEW."metadata" IS DISTINCT FROM OLD."metadata"
    OR NEW."created_by_user_id" IS DISTINCT FROM OLD."created_by_user_id"
    OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
  THEN
    RAISE EXCEPTION 'artwork version content is immutable' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "artwork_versions_content_immutable"
BEFORE UPDATE ON "artwork_versions"
FOR EACH ROW EXECUTE FUNCTION prevent_artwork_version_content_mutation();

CREATE OR REPLACE FUNCTION prevent_artwork_version_deletion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'artwork versions are immutable and cannot be deleted' USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "artwork_versions_delete_immutable"
BEFORE DELETE ON "artwork_versions"
FOR EACH ROW EXECUTE FUNCTION prevent_artwork_version_deletion();
