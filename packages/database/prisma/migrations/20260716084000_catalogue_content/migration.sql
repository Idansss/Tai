CREATE TYPE "TagKind" AS ENUM ('GENERAL', 'THEME', 'MOOD', 'COLOUR_FAMILY');
CREATE TYPE "StoryBlockType" AS ENUM ('TEXT', 'IMAGE', 'QUOTE', 'EMBED');

CREATE TABLE "tags" (
  "id" UUID PRIMARY KEY,
  "slug" VARCHAR(100) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "kind" "TagKind" NOT NULL DEFAULT 'GENERAL',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tags_slug_format_check" CHECK ("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT "tags_name_check" CHECK (length(btrim("name")) > 0)
);
CREATE TABLE "artwork_tags" (
  "artwork_id" UUID NOT NULL,
  "tag_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("artwork_id", "tag_id")
);
CREATE TABLE "collections" (
  "id" UUID PRIMARY KEY,
  "slug" VARCHAR(160) NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "status" "ArtworkStatus" NOT NULL DEFAULT 'DRAFT',
  "created_by_user_id" UUID NOT NULL,
  "published_at" TIMESTAMPTZ(3),
  "archived_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "collections_slug_format_check" CHECK ("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT "collections_title_check" CHECK (length(btrim("title")) > 0),
  CONSTRAINT "collections_lifecycle_check" CHECK (
    ("status" = 'DRAFT' AND "published_at" IS NULL AND "archived_at" IS NULL)
    OR ("status" = 'PUBLISHED' AND "published_at" IS NOT NULL AND "archived_at" IS NULL)
    OR ("status" = 'ARCHIVED' AND "archived_at" IS NOT NULL)
  )
);
CREATE TABLE "collection_artworks" (
  "collection_id" UUID NOT NULL,
  "artwork_id" UUID NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("collection_id", "artwork_id"),
  CONSTRAINT "collection_artworks_position_check" CHECK ("position" >= 0)
);
CREATE TABLE "drops" (
  "id" UUID PRIMARY KEY,
  "slug" VARCHAR(160) NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "status" "ArtworkStatus" NOT NULL DEFAULT 'DRAFT',
  "starts_at" TIMESTAMPTZ(3),
  "ends_at" TIMESTAMPTZ(3),
  "created_by_user_id" UUID NOT NULL,
  "published_at" TIMESTAMPTZ(3),
  "archived_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "drops_slug_format_check" CHECK ("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT "drops_title_check" CHECK (length(btrim("title")) > 0),
  CONSTRAINT "drops_window_check" CHECK ("ends_at" IS NULL OR "starts_at" IS NOT NULL AND "ends_at" > "starts_at"),
  CONSTRAINT "drops_lifecycle_check" CHECK (
    ("status" = 'DRAFT' AND "published_at" IS NULL AND "archived_at" IS NULL)
    OR ("status" = 'PUBLISHED' AND "published_at" IS NOT NULL AND "archived_at" IS NULL)
    OR ("status" = 'ARCHIVED' AND "archived_at" IS NOT NULL)
  )
);
CREATE TABLE "drop_artworks" (
  "drop_id" UUID NOT NULL,
  "artwork_id" UUID NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("drop_id", "artwork_id"),
  CONSTRAINT "drop_artworks_position_check" CHECK ("position" >= 0)
);
CREATE TABLE "editions" (
  "id" UUID PRIMARY KEY,
  "artwork_id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "total_quantity" INTEGER,
  "numbered" BOOLEAN NOT NULL DEFAULT false,
  "status" "ArtworkStatus" NOT NULL DEFAULT 'DRAFT',
  "released_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "editions_name_check" CHECK (length(btrim("name")) > 0),
  CONSTRAINT "editions_quantity_check" CHECK ("total_quantity" IS NULL OR "total_quantity" > 0),
  CONSTRAINT "editions_numbered_check" CHECK (NOT "numbered" OR "total_quantity" IS NOT NULL)
);
CREATE TABLE "stories" (
  "id" UUID PRIMARY KEY,
  "slug" VARCHAR(160) NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "excerpt" VARCHAR(500),
  "status" "ArtworkStatus" NOT NULL DEFAULT 'DRAFT',
  "artwork_id" UUID,
  "collection_id" UUID,
  "created_by_user_id" UUID NOT NULL,
  "published_at" TIMESTAMPTZ(3),
  "archived_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "stories_slug_format_check" CHECK ("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT "stories_title_check" CHECK (length(btrim("title")) > 0),
  CONSTRAINT "stories_parent_check" CHECK (num_nonnulls("artwork_id", "collection_id") <= 1),
  CONSTRAINT "stories_lifecycle_check" CHECK (
    ("status" = 'DRAFT' AND "published_at" IS NULL AND "archived_at" IS NULL)
    OR ("status" = 'PUBLISHED' AND "published_at" IS NOT NULL AND "archived_at" IS NULL)
    OR ("status" = 'ARCHIVED' AND "archived_at" IS NOT NULL)
  )
);
CREATE TABLE "story_blocks" (
  "id" UUID PRIMARY KEY,
  "story_id" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "type" "StoryBlockType" NOT NULL,
  "content" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "story_blocks_position_check" CHECK ("position" >= 0),
  CONSTRAINT "story_blocks_content_check" CHECK (jsonb_typeof("content") = 'object')
);

CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");
CREATE INDEX "tags_kind_name_idx" ON "tags"("kind", "name");
CREATE INDEX "artwork_tags_tag_artwork_idx" ON "artwork_tags"("tag_id", "artwork_id");
CREATE UNIQUE INDEX "collections_slug_key" ON "collections"("slug");
CREATE INDEX "collections_status_published_at_idx" ON "collections"("status", "published_at");
CREATE INDEX "collection_artworks_artwork_collection_idx" ON "collection_artworks"("artwork_id", "collection_id");
CREATE INDEX "collection_artworks_collection_position_idx" ON "collection_artworks"("collection_id", "position");
CREATE UNIQUE INDEX "drops_slug_key" ON "drops"("slug");
CREATE INDEX "drops_status_starts_at_idx" ON "drops"("status", "starts_at");
CREATE INDEX "drop_artworks_artwork_drop_idx" ON "drop_artworks"("artwork_id", "drop_id");
CREATE INDEX "drop_artworks_drop_position_idx" ON "drop_artworks"("drop_id", "position");
CREATE UNIQUE INDEX "editions_artwork_name_key" ON "editions"("artwork_id", "name");
CREATE INDEX "editions_status_released_at_idx" ON "editions"("status", "released_at");
CREATE UNIQUE INDEX "stories_slug_key" ON "stories"("slug");
CREATE INDEX "stories_status_published_at_idx" ON "stories"("status", "published_at");
CREATE INDEX "stories_artwork_id_idx" ON "stories"("artwork_id");
CREATE INDEX "stories_collection_id_idx" ON "stories"("collection_id");
CREATE UNIQUE INDEX "story_blocks_story_position_key" ON "story_blocks"("story_id", "position");

ALTER TABLE "artwork_tags" ADD CONSTRAINT "artwork_tags_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "artworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "artwork_tags" ADD CONSTRAINT "artwork_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collections" ADD CONSTRAINT "collections_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "collection_artworks" ADD CONSTRAINT "collection_artworks_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collection_artworks" ADD CONSTRAINT "collection_artworks_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "artworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "drops" ADD CONSTRAINT "drops_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "drop_artworks" ADD CONSTRAINT "drop_artworks_drop_id_fkey" FOREIGN KEY ("drop_id") REFERENCES "drops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "drop_artworks" ADD CONSTRAINT "drop_artworks_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "artworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "editions" ADD CONSTRAINT "editions_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "artworks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stories" ADD CONSTRAINT "stories_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "artworks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stories" ADD CONSTRAINT "stories_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stories" ADD CONSTRAINT "stories_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "story_blocks" ADD CONSTRAINT "story_blocks_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
