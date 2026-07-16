CREATE TYPE "DesignVisibility" AS ENUM ('PRIVATE', 'UNLISTED');

CREATE TABLE "design_configurations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "artwork_version_id" UUID NOT NULL,
  "garment_variant_id" UUID NOT NULL,
  "placement_id" UUID NOT NULL,
  "scale_preset_id" UUID NOT NULL,
  "view" "GarmentView" NOT NULL,
  "configuration_hash" CHAR(64) NOT NULL,
  "name" VARCHAR(120),
  "visibility" "DesignVisibility" NOT NULL DEFAULT 'PRIVATE',
  "share_token" VARCHAR(64),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "design_configurations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "design_configurations_hash_check" CHECK ("configuration_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "design_configurations_name_check" CHECK ("name" IS NULL OR btrim("name") <> ''),
  -- An unlisted design is reachable only through a share token, so the two must agree.
  CONSTRAINT "design_configurations_share_check" CHECK (
    ("visibility" = 'UNLISTED' AND "share_token" IS NOT NULL)
    OR ("visibility" = 'PRIVATE' AND "share_token" IS NULL)
  ),
  CONSTRAINT "design_configurations_share_token_check" CHECK (
    "share_token" IS NULL OR "share_token" ~ '^[A-Za-z0-9_-]{32,64}$'
  )
);

ALTER TABLE "design_configurations"
  ADD CONSTRAINT "design_configurations_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Restrict, never cascade: a saved design must not outlive or silently lose the exact
-- immutable artwork version and approved garment configuration it was built from.
ALTER TABLE "design_configurations"
  ADD CONSTRAINT "design_configurations_artwork_version_id_fkey"
  FOREIGN KEY ("artwork_version_id") REFERENCES "artwork_versions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "design_configurations"
  ADD CONSTRAINT "design_configurations_garment_variant_id_fkey"
  FOREIGN KEY ("garment_variant_id") REFERENCES "garment_variants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "design_configurations"
  ADD CONSTRAINT "design_configurations_placement_id_fkey"
  FOREIGN KEY ("placement_id") REFERENCES "garment_placements" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "design_configurations"
  ADD CONSTRAINT "design_configurations_scale_preset_id_fkey"
  FOREIGN KEY ("scale_preset_id") REFERENCES "garment_scale_presets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One saved design per owner per exact approved tuple; re-saving returns the existing row.
CREATE UNIQUE INDEX "design_configurations_owner_hash_key"
  ON "design_configurations" ("owner_user_id", "configuration_hash");

CREATE UNIQUE INDEX "design_configurations_share_token_key"
  ON "design_configurations" ("share_token");

CREATE INDEX "design_configurations_owner_created_at_idx"
  ON "design_configurations" ("owner_user_id", "created_at");
