CREATE TYPE "GarmentType" AS ENUM ('CLASSIC_TSHIRT', 'OVERSIZED_TSHIRT', 'LONG_SLEEVE', 'HOODIE', 'SWEATSHIRT', 'TOTE_BAG', 'CAP', 'ART_PRINT');
CREATE TYPE "GarmentView" AS ENUM ('FRONT', 'BACK', 'LEFT', 'RIGHT');
CREATE TYPE "CompatibilityStatus" AS ENUM ('DRAFT', 'APPROVED', 'ARCHIVED');

CREATE TABLE "garment_templates" (
  "id" UUID PRIMARY KEY,
  "slug" VARCHAR(160) NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "type" "GarmentType" NOT NULL,
  "fabric" VARCHAR(500),
  "fit" VARCHAR(500),
  "care" TEXT,
  "status" "ArtworkStatus" NOT NULL DEFAULT 'DRAFT',
  "created_by_user_id" UUID NOT NULL,
  "published_at" TIMESTAMPTZ(3),
  "archived_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "garment_templates_slug_format_check" CHECK ("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT "garment_templates_title_check" CHECK (length(btrim("title")) > 0),
  CONSTRAINT "garment_templates_lifecycle_check" CHECK (
    ("status" = 'DRAFT' AND "published_at" IS NULL AND "archived_at" IS NULL)
    OR ("status" = 'PUBLISHED' AND "published_at" IS NOT NULL AND "archived_at" IS NULL)
    OR ("status" = 'ARCHIVED' AND "archived_at" IS NOT NULL)
  )
);

CREATE TABLE "garment_colours" (
  "id" UUID PRIMARY KEY,
  "template_id" UUID NOT NULL,
  "slug" VARCHAR(100) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "hex" CHAR(7) NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "status" "ArtworkStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "garment_colours_slug_format_check" CHECK ("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT "garment_colours_name_check" CHECK (length(btrim("name")) > 0),
  CONSTRAINT "garment_colours_hex_check" CHECK ("hex" ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT "garment_colours_position_check" CHECK ("position" >= 0)
);

CREATE TABLE "garment_sizes" (
  "id" UUID PRIMARY KEY,
  "template_id" UUID NOT NULL,
  "code" VARCHAR(32) NOT NULL,
  "label" VARCHAR(100) NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "status" "ArtworkStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "garment_sizes_code_check" CHECK (length(btrim("code")) > 0),
  CONSTRAINT "garment_sizes_label_check" CHECK (length(btrim("label")) > 0),
  CONSTRAINT "garment_sizes_position_check" CHECK ("position" >= 0)
);

CREATE TABLE "garment_size_measurements" (
  "id" UUID PRIMARY KEY,
  "size_id" UUID NOT NULL,
  "key" VARCHAR(64) NOT NULL,
  "label" VARCHAR(100) NOT NULL,
  "value_mm" INTEGER NOT NULL,
  CONSTRAINT "garment_size_measurements_key_check" CHECK ("key" ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT "garment_size_measurements_label_check" CHECK (length(btrim("label")) > 0),
  CONSTRAINT "garment_size_measurements_value_check" CHECK ("value_mm" > 0)
);

CREATE TABLE "garment_variants" (
  "id" UUID PRIMARY KEY,
  "template_id" UUID NOT NULL,
  "colour_id" UUID NOT NULL,
  "size_id" UUID NOT NULL,
  "sku" VARCHAR(80) NOT NULL,
  "status" "ArtworkStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "garment_variants_sku_check" CHECK (length(btrim("sku")) > 0)
);

CREATE TABLE "garment_placements" (
  "id" UUID PRIMARY KEY,
  "template_id" UUID NOT NULL,
  "slug" VARCHAR(100) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "view" "GarmentView" NOT NULL,
  "x_permille" INTEGER NOT NULL,
  "y_permille" INTEGER NOT NULL,
  "width_permille" INTEGER NOT NULL,
  "height_permille" INTEGER NOT NULL,
  "print_width_mm" INTEGER NOT NULL,
  "print_height_mm" INTEGER NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "status" "ArtworkStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "garment_placements_slug_format_check" CHECK ("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT "garment_placements_name_check" CHECK (length(btrim("name")) > 0),
  CONSTRAINT "garment_placements_geometry_check" CHECK (
    "x_permille" >= 0 AND "y_permille" >= 0
    AND "width_permille" > 0 AND "height_permille" > 0
    AND "x_permille" + "width_permille" <= 1000
    AND "y_permille" + "height_permille" <= 1000
  ),
  CONSTRAINT "garment_placements_print_dimensions_check" CHECK ("print_width_mm" > 0 AND "print_height_mm" > 0),
  CONSTRAINT "garment_placements_position_check" CHECK ("position" >= 0)
);

CREATE TABLE "garment_scale_presets" (
  "id" UUID PRIMARY KEY,
  "placement_id" UUID NOT NULL,
  "slug" VARCHAR(64) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "scale_percent" INTEGER NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "status" "ArtworkStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "garment_scale_presets_slug_format_check" CHECK ("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT "garment_scale_presets_name_check" CHECK (length(btrim("name")) > 0),
  CONSTRAINT "garment_scale_presets_scale_check" CHECK ("scale_percent" BETWEEN 1 AND 100),
  CONSTRAINT "garment_scale_presets_position_check" CHECK ("position" >= 0)
);

CREATE TABLE "artwork_garment_compatibilities" (
  "id" UUID PRIMARY KEY,
  "artwork_version_id" UUID NOT NULL,
  "template_id" UUID NOT NULL,
  "status" "CompatibilityStatus" NOT NULL DEFAULT 'DRAFT',
  "created_by_user_id" UUID NOT NULL,
  "approved_by_user_id" UUID,
  "approved_at" TIMESTAMPTZ(3),
  "archived_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "artwork_garment_compatibilities_lifecycle_check" CHECK (
    ("status" = 'DRAFT' AND "approved_by_user_id" IS NULL AND "approved_at" IS NULL AND "archived_at" IS NULL)
    OR ("status" = 'APPROVED' AND "approved_by_user_id" IS NOT NULL AND "approved_at" IS NOT NULL AND "archived_at" IS NULL)
    OR ("status" = 'ARCHIVED' AND "archived_at" IS NOT NULL)
  )
);

CREATE TABLE "artwork_garment_placements" (
  "compatibility_id" UUID NOT NULL,
  "placement_id" UUID NOT NULL,
  PRIMARY KEY ("compatibility_id", "placement_id")
);

CREATE UNIQUE INDEX "garment_templates_slug_key" ON "garment_templates"("slug");
CREATE INDEX "garment_templates_status_created_at_idx" ON "garment_templates"("status", "created_at");
CREATE UNIQUE INDEX "garment_colours_template_slug_key" ON "garment_colours"("template_id", "slug");
CREATE INDEX "garment_colours_template_status_position_idx" ON "garment_colours"("template_id", "status", "position");
CREATE UNIQUE INDEX "garment_sizes_template_code_key" ON "garment_sizes"("template_id", "code");
CREATE INDEX "garment_sizes_template_status_position_idx" ON "garment_sizes"("template_id", "status", "position");
CREATE UNIQUE INDEX "garment_size_measurements_size_key_key" ON "garment_size_measurements"("size_id", "key");
CREATE UNIQUE INDEX "garment_variants_sku_key" ON "garment_variants"("sku");
CREATE UNIQUE INDEX "garment_variants_template_colour_size_key" ON "garment_variants"("template_id", "colour_id", "size_id");
CREATE INDEX "garment_variants_template_status_idx" ON "garment_variants"("template_id", "status");
CREATE UNIQUE INDEX "garment_placements_template_slug_key" ON "garment_placements"("template_id", "slug");
CREATE INDEX "garment_placements_template_status_position_idx" ON "garment_placements"("template_id", "status", "position");
CREATE UNIQUE INDEX "garment_scale_presets_placement_slug_key" ON "garment_scale_presets"("placement_id", "slug");
CREATE INDEX "garment_scale_presets_placement_status_position_idx" ON "garment_scale_presets"("placement_id", "status", "position");
CREATE UNIQUE INDEX "artwork_garment_compatibilities_version_template_key" ON "artwork_garment_compatibilities"("artwork_version_id", "template_id");
CREATE INDEX "artwork_garment_compatibilities_template_status_idx" ON "artwork_garment_compatibilities"("template_id", "status");
CREATE INDEX "artwork_garment_placements_placement_compatibility_idx" ON "artwork_garment_placements"("placement_id", "compatibility_id");

ALTER TABLE "garment_templates" ADD CONSTRAINT "garment_templates_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "garment_colours" ADD CONSTRAINT "garment_colours_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "garment_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "garment_sizes" ADD CONSTRAINT "garment_sizes_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "garment_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "garment_size_measurements" ADD CONSTRAINT "garment_size_measurements_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "garment_sizes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "garment_variants" ADD CONSTRAINT "garment_variants_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "garment_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "garment_variants" ADD CONSTRAINT "garment_variants_colour_id_fkey" FOREIGN KEY ("colour_id") REFERENCES "garment_colours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "garment_variants" ADD CONSTRAINT "garment_variants_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "garment_sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "garment_placements" ADD CONSTRAINT "garment_placements_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "garment_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "garment_scale_presets" ADD CONSTRAINT "garment_scale_presets_placement_id_fkey" FOREIGN KEY ("placement_id") REFERENCES "garment_placements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "artwork_garment_compatibilities" ADD CONSTRAINT "artwork_garment_compatibilities_artwork_version_id_fkey" FOREIGN KEY ("artwork_version_id") REFERENCES "artwork_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "artwork_garment_compatibilities" ADD CONSTRAINT "artwork_garment_compatibilities_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "garment_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "artwork_garment_compatibilities" ADD CONSTRAINT "artwork_garment_compatibilities_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "artwork_garment_compatibilities" ADD CONSTRAINT "artwork_garment_compatibilities_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "artwork_garment_placements" ADD CONSTRAINT "artwork_garment_placements_compatibility_id_fkey" FOREIGN KEY ("compatibility_id") REFERENCES "artwork_garment_compatibilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "artwork_garment_placements" ADD CONSTRAINT "artwork_garment_placements_placement_id_fkey" FOREIGN KEY ("placement_id") REFERENCES "garment_placements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION validate_garment_variant_template() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "garment_colours" WHERE "id" = NEW."colour_id" AND "template_id" = NEW."template_id")
     OR NOT EXISTS (SELECT 1 FROM "garment_sizes" WHERE "id" = NEW."size_id" AND "template_id" = NEW."template_id") THEN
    RAISE EXCEPTION 'garment variant colour and size must belong to its template' USING ERRCODE = '23514', CONSTRAINT = 'garment_variants_template_membership_check';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "garment_variants_template_membership_trigger"
BEFORE INSERT OR UPDATE OF "template_id", "colour_id", "size_id" ON "garment_variants"
FOR EACH ROW EXECUTE FUNCTION validate_garment_variant_template();

CREATE FUNCTION validate_artwork_garment_placement_template() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "artwork_garment_compatibilities" compatibility
    JOIN "garment_placements" placement ON placement."id" = NEW."placement_id"
    WHERE compatibility."id" = NEW."compatibility_id"
      AND compatibility."template_id" = placement."template_id"
  ) THEN
    RAISE EXCEPTION 'compatible placement must belong to the compatibility template' USING ERRCODE = '23514', CONSTRAINT = 'artwork_garment_placements_template_membership_check';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "artwork_garment_placements_template_membership_trigger"
BEFORE INSERT OR UPDATE OF "compatibility_id", "placement_id" ON "artwork_garment_placements"
FOR EACH ROW EXECUTE FUNCTION validate_artwork_garment_placement_template();
