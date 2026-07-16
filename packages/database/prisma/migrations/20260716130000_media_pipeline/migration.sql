CREATE TYPE "MediaAssetKind" AS ENUM ('ORIGINAL', 'WEB_DERIVATIVE', 'THUMBNAIL', 'MOCKUP');
CREATE TYPE "MediaProcessingStatus" AS ENUM ('QUEUED', 'PROCESSING', 'READY', 'FAILED');
CREATE TYPE "MalwareScanStatus" AS ENUM ('CLEAN', 'INFECTED', 'ERROR');
CREATE TYPE "MediaApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "MediaJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "artwork_assets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "artwork_version_id" UUID NOT NULL,
  "source_asset_id" UUID,
  "garment_template_id" UUID,
  "garment_placement_id" UUID,
  "kind" "MediaAssetKind" NOT NULL,
  "variant_key" VARCHAR(160) NOT NULL,
  "storage_key" VARCHAR(500) NOT NULL,
  "original_filename" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "extension" VARCHAR(16) NOT NULL,
  "byte_size" INTEGER NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "has_alpha" BOOLEAN NOT NULL DEFAULT false,
  "checksum_sha256" CHAR(64) NOT NULL,
  "dominant_hex" CHAR(7),
  "low_resolution" BOOLEAN NOT NULL DEFAULT false,
  "processing_status" "MediaProcessingStatus" NOT NULL DEFAULT 'QUEUED',
  "malware_scan_status" "MalwareScanStatus" NOT NULL,
  "approval_status" "MediaApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  "failure_code" VARCHAR(100),
  "failure_message" VARCHAR(500),
  "rejection_reason" VARCHAR(500),
  "metadata" JSONB,
  "created_by_user_id" UUID NOT NULL,
  "approved_by_user_id" UUID,
  "approved_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "artwork_assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "artwork_assets_dimensions_check" CHECK (
    "byte_size" > 0 AND "width" BETWEEN 1 AND 20000 AND "height" BETWEEN 1 AND 20000
    AND ("kind" IN ('WEB_DERIVATIVE', 'THUMBNAIL') OR ("width" >= 512 AND "height" >= 512))
  ),
  CONSTRAINT "artwork_assets_checksum_check" CHECK ("checksum_sha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "artwork_assets_colour_check" CHECK ("dominant_hex" IS NULL OR "dominant_hex" ~ '^#[0-9a-f]{6}$'),
  CONSTRAINT "artwork_assets_failure_check" CHECK (("processing_status" = 'FAILED') = ("failure_code" IS NOT NULL AND "failure_message" IS NOT NULL)),
  CONSTRAINT "artwork_assets_approval_check" CHECK (
    ("approval_status" = 'APPROVED' AND "approved_by_user_id" IS NOT NULL AND "approved_at" IS NOT NULL AND "rejection_reason" IS NULL)
    OR ("approval_status" = 'REJECTED' AND "approved_by_user_id" IS NOT NULL AND "approved_at" IS NOT NULL AND "rejection_reason" IS NOT NULL)
    OR ("approval_status" IN ('PENDING', 'NOT_REQUIRED') AND "approved_by_user_id" IS NULL AND "approved_at" IS NULL AND "rejection_reason" IS NULL)
  ),
  CONSTRAINT "artwork_assets_shape_check" CHECK (
    ("kind" = 'ORIGINAL' AND "source_asset_id" IS NULL AND "garment_template_id" IS NULL AND "garment_placement_id" IS NULL AND "approval_status" = 'NOT_REQUIRED')
    OR ("kind" IN ('WEB_DERIVATIVE', 'THUMBNAIL') AND "source_asset_id" IS NOT NULL AND "garment_template_id" IS NULL AND "garment_placement_id" IS NULL AND "approval_status" = 'NOT_REQUIRED')
    OR ("kind" = 'MOCKUP' AND "source_asset_id" IS NOT NULL AND "garment_template_id" IS NOT NULL AND "garment_placement_id" IS NOT NULL AND "approval_status" <> 'NOT_REQUIRED')
  )
);

CREATE TABLE "media_processing_jobs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "original_asset_id" UUID NOT NULL,
  "status" "MediaJobStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 3,
  "failure_code" VARCHAR(100),
  "failure_message" VARCHAR(500),
  "started_at" TIMESTAMPTZ(3),
  "completed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "media_processing_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "media_processing_jobs_attempts_check" CHECK ("attempts" >= 0 AND "attempts" <= "max_attempts" AND "max_attempts" BETWEEN 1 AND 10),
  CONSTRAINT "media_processing_jobs_failure_check" CHECK (("status" = 'FAILED') = ("failure_code" IS NOT NULL AND "failure_message" IS NOT NULL)),
  CONSTRAINT "media_processing_jobs_completion_check" CHECK (("status" = 'SUCCEEDED') = ("completed_at" IS NOT NULL))
);

CREATE UNIQUE INDEX "artwork_assets_storage_key_key" ON "artwork_assets"("storage_key");
CREATE UNIQUE INDEX "artwork_assets_version_kind_variant_key" ON "artwork_assets"("artwork_version_id", "kind", "variant_key");
CREATE INDEX "artwork_assets_version_kind_status_idx" ON "artwork_assets"("artwork_version_id", "kind", "processing_status");
CREATE INDEX "artwork_assets_approval_kind_created_idx" ON "artwork_assets"("approval_status", "kind", "created_at");
CREATE UNIQUE INDEX "media_processing_jobs_original_asset_key" ON "media_processing_jobs"("original_asset_id");
CREATE INDEX "media_processing_jobs_status_created_idx" ON "media_processing_jobs"("status", "created_at");

ALTER TABLE "artwork_assets" ADD CONSTRAINT "artwork_assets_artwork_version_id_fkey" FOREIGN KEY ("artwork_version_id") REFERENCES "artwork_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "artwork_assets" ADD CONSTRAINT "artwork_assets_source_asset_id_fkey" FOREIGN KEY ("source_asset_id") REFERENCES "artwork_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "artwork_assets" ADD CONSTRAINT "artwork_assets_garment_template_id_fkey" FOREIGN KEY ("garment_template_id") REFERENCES "garment_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "artwork_assets" ADD CONSTRAINT "artwork_assets_garment_placement_id_fkey" FOREIGN KEY ("garment_placement_id") REFERENCES "garment_placements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "artwork_assets" ADD CONSTRAINT "artwork_assets_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "artwork_assets" ADD CONSTRAINT "artwork_assets_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_processing_jobs" ADD CONSTRAINT "media_processing_jobs_original_asset_id_fkey" FOREIGN KEY ("original_asset_id") REFERENCES "artwork_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION enforce_media_asset_membership() RETURNS trigger AS $$
BEGIN
  IF NEW.source_asset_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM artwork_assets source
    WHERE source.id = NEW.source_asset_id AND source.artwork_version_id = NEW.artwork_version_id AND source.kind = 'ORIGINAL'
  ) THEN RAISE EXCEPTION 'media derivative source must be the same artwork version original'; END IF;
  IF NEW.garment_placement_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM garment_placements placement
    WHERE placement.id = NEW.garment_placement_id AND placement.template_id = NEW.garment_template_id
  ) THEN RAISE EXCEPTION 'mockup placement must belong to its garment template'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER artwork_assets_membership_guard
BEFORE INSERT OR UPDATE ON artwork_assets
FOR EACH ROW EXECUTE FUNCTION enforce_media_asset_membership();

CREATE OR REPLACE FUNCTION enforce_media_asset_immutability() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'media assets are immutable and cannot be deleted'; END IF;
  IF OLD.artwork_version_id <> NEW.artwork_version_id
    OR OLD.source_asset_id IS DISTINCT FROM NEW.source_asset_id
    OR OLD.garment_template_id IS DISTINCT FROM NEW.garment_template_id
    OR OLD.garment_placement_id IS DISTINCT FROM NEW.garment_placement_id
    OR OLD.kind <> NEW.kind OR OLD.variant_key <> NEW.variant_key OR OLD.storage_key <> NEW.storage_key
    OR OLD.original_filename <> NEW.original_filename OR OLD.mime_type <> NEW.mime_type OR OLD.extension <> NEW.extension
    OR OLD.byte_size <> NEW.byte_size OR OLD.width <> NEW.width OR OLD.height <> NEW.height
    OR OLD.has_alpha <> NEW.has_alpha OR OLD.checksum_sha256 <> NEW.checksum_sha256
    OR OLD.dominant_hex IS DISTINCT FROM NEW.dominant_hex OR OLD.low_resolution <> NEW.low_resolution
    OR OLD.malware_scan_status <> NEW.malware_scan_status OR OLD.created_by_user_id <> NEW.created_by_user_id
    OR OLD.created_at <> NEW.created_at
  THEN RAISE EXCEPTION 'media asset bytes and provenance are immutable'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER artwork_assets_immutable_guard
BEFORE UPDATE OR DELETE ON artwork_assets
FOR EACH ROW EXECUTE FUNCTION enforce_media_asset_immutability();
