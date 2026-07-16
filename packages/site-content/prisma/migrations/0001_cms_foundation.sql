-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "cms";

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'ADMINISTRATOR', 'RESTRICTED_STAFF');

-- CreateEnum
CREATE TYPE "AdminUserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AnnouncementTone" AS ENUM ('DEFAULT', 'INFO', 'SUCCESS', 'WARNING');

-- CreateEnum
CREATE TYPE "NavGroup" AS ENUM ('PRIMARY', 'FOOTER', 'SOCIAL');

-- CreateEnum
CREATE TYPE "StudioGuideKind" AS ENUM ('INTRO', 'SUGGESTED_QUESTION', 'KNOWLEDGE');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'RESTRICTED_STAFF',
    "status" "AdminUserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "actor_email" VARCHAR(320),
    "action" VARCHAR(80) NOT NULL,
    "resource_type" VARCHAR(80) NOT NULL,
    "resource_id" VARCHAR(120),
    "summary" VARCHAR(500) NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "message" VARCHAR(280) NOT NULL,
    "href" VARCHAR(500),
    "link_label" VARCHAR(80),
    "tone" "AnnouncementTone" NOT NULL DEFAULT 'DEFAULT',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "starts_at" TIMESTAMPTZ(3),
    "ends_at" TIMESTAMPTZ(3),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMPTZ(3),
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_pages" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "body" JSONB NOT NULL DEFAULT '[]',
    "seo_title" VARCHAR(200),
    "seo_description" VARCHAR(400),
    "social_image_url" VARCHAR(500),
    "scheduled_for" TIMESTAMPTZ(3),
    "published_at" TIMESTAMPTZ(3),
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "content_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homepage_sections" (
    "id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "title" VARCHAR(200),
    "subtitle" VARCHAR(400),
    "body" JSONB NOT NULL DEFAULT '{}',
    "media_url" VARCHAR(500),
    "cta_label" VARCHAR(80),
    "cta_href" VARCHAR(500),
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "scheduled_for" TIMESTAMPTZ(3),
    "published_at" TIMESTAMPTZ(3),
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "homepage_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nav_links" (
    "id" UUID NOT NULL,
    "group" "NavGroup" NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "href" VARCHAR(500) NOT NULL,
    "icon" VARCHAR(40),
    "column_key" VARCHAR(40),
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "nav_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_entries" (
    "id" UUID NOT NULL,
    "route_path" VARCHAR(200) NOT NULL,
    "title" VARCHAR(200),
    "description" VARCHAR(400),
    "social_image_url" VARCHAR(500),
    "canonical_url" VARCHAR(500),
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "seo_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redirects" (
    "id" UUID NOT NULL,
    "from_path" VARCHAR(500) NOT NULL,
    "to_path" VARCHAR(500) NOT NULL,
    "status_code" INTEGER NOT NULL DEFAULT 301,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "redirects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_guide_entries" (
    "id" UUID NOT NULL,
    "kind" "StudioGuideKind" NOT NULL,
    "question" VARCHAR(300),
    "body" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "studio_guide_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "key" VARCHAR(80) NOT NULL,
    "value" JSONB NOT NULL,
    "description" VARCHAR(400),
    "updated_by_id" UUID,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "filename" VARCHAR(200) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt" VARCHAR(300),
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cms_admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "cms_admin_users_status_idx" ON "admin_users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "cms_admin_sessions_token_hash_key" ON "admin_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "cms_admin_sessions_user_state_idx" ON "admin_sessions"("admin_user_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "cms_admin_sessions_expires_at_idx" ON "admin_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "cms_audit_events_resource_idx" ON "audit_events"("resource_type", "resource_id", "created_at");

-- CreateIndex
CREATE INDEX "cms_audit_events_actor_idx" ON "audit_events"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "cms_audit_events_created_at_idx" ON "audit_events"("created_at");

-- CreateIndex
CREATE INDEX "cms_announcements_status_idx" ON "announcements"("status", "deleted_at", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "cms_content_pages_slug_key" ON "content_pages"("slug");

-- CreateIndex
CREATE INDEX "cms_content_pages_status_idx" ON "content_pages"("status", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "cms_homepage_sections_key_key" ON "homepage_sections"("key");

-- CreateIndex
CREATE INDEX "cms_homepage_sections_status_idx" ON "homepage_sections"("status", "deleted_at", "sort_order");

-- CreateIndex
CREATE INDEX "cms_nav_links_group_idx" ON "nav_links"("group", "status", "deleted_at", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "cms_seo_entries_route_key" ON "seo_entries"("route_path");

-- CreateIndex
CREATE UNIQUE INDEX "cms_redirects_from_key" ON "redirects"("from_path");

-- CreateIndex
CREATE INDEX "cms_studio_guide_kind_idx" ON "studio_guide_entries"("kind", "status", "deleted_at", "sort_order");

-- CreateIndex
CREATE INDEX "cms_media_assets_idx" ON "media_assets"("deleted_at", "created_at");

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

