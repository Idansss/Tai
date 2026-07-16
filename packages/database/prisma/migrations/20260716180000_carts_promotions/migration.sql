CREATE TYPE "PromotionKind" AS ENUM ('PERCENT_OFF', 'FIXED_AMOUNT');
CREATE TYPE "PromotionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISABLED');

CREATE TABLE "promotions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(64) NOT NULL,
  "label" VARCHAR(120) NOT NULL,
  "kind" "PromotionKind" NOT NULL,
  "value" INTEGER NOT NULL,
  "currency" CHAR(3),
  "status" "PromotionStatus" NOT NULL DEFAULT 'DRAFT',
  "starts_at" TIMESTAMPTZ(3),
  "ends_at" TIMESTAMPTZ(3),
  "min_subtotal_minor" INTEGER,
  "max_discount_minor" INTEGER,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "promotions_pkey" PRIMARY KEY ("id"),
  -- A percentage is 1-100; a fixed amount is money in minor units and needs a currency to
  -- mean anything, so the two shapes are enforced rather than trusted.
  CONSTRAINT "promotions_value_check" CHECK (
    ("kind" = 'PERCENT_OFF' AND "value" BETWEEN 1 AND 100 AND "currency" IS NULL)
    OR ("kind" = 'FIXED_AMOUNT' AND "value" > 0 AND "value" <= 100000000 AND "currency" IS NOT NULL)
  ),
  CONSTRAINT "promotions_currency_check" CHECK ("currency" IS NULL OR "currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "promotions_window_check" CHECK (
    "starts_at" IS NULL OR "ends_at" IS NULL OR "ends_at" > "starts_at"
  ),
  CONSTRAINT "promotions_min_subtotal_check" CHECK (
    "min_subtotal_minor" IS NULL OR "min_subtotal_minor" > 0
  ),
  CONSTRAINT "promotions_max_discount_check" CHECK (
    "max_discount_minor" IS NULL OR "max_discount_minor" > 0
  ),
  CONSTRAINT "promotions_code_check" CHECK ("code" ~ '^[A-Z0-9][A-Z0-9_-]{2,63}$')
);

ALTER TABLE "promotions"
  ADD CONSTRAINT "promotions_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "promotions_code_key" ON "promotions" ("code");
CREATE INDEX "promotions_status_starts_idx" ON "promotions" ("status", "starts_at");

CREATE TABLE "carts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID,
  "guest_token" VARCHAR(64),
  "promotion_id" UUID,
  "last_activity_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "carts_pkey" PRIMARY KEY ("id"),
  -- A cart has exactly one owner: a signed-in customer or an anonymous guest token. Both or
  -- neither would make ownership ambiguous at merge and at checkout.
  CONSTRAINT "carts_owner_check" CHECK (
    ("user_id" IS NOT NULL AND "guest_token" IS NULL)
    OR ("user_id" IS NULL AND "guest_token" IS NOT NULL)
  ),
  CONSTRAINT "carts_guest_token_check" CHECK (
    "guest_token" IS NULL OR "guest_token" ~ '^[A-Za-z0-9_-]{32,64}$'
  )
);

ALTER TABLE "carts"
  ADD CONSTRAINT "carts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Deleting a promotion must not delete carts; the cart simply loses the discount.
ALTER TABLE "carts"
  ADD CONSTRAINT "carts_promotion_id_fkey"
  FOREIGN KEY ("promotion_id") REFERENCES "promotions" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- One cart per customer, and a guest token identifies exactly one cart.
CREATE UNIQUE INDEX "carts_user_id_key" ON "carts" ("user_id");
CREATE UNIQUE INDEX "carts_guest_token_key" ON "carts" ("guest_token");
CREATE INDEX "carts_last_activity_idx" ON "carts" ("last_activity_at");

CREATE TABLE "cart_lines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "cart_id" UUID NOT NULL,
  "artwork_version_id" UUID NOT NULL,
  "garment_variant_id" UUID NOT NULL,
  "placement_id" UUID NOT NULL,
  "scale_preset_id" UUID NOT NULL,
  "view" "GarmentView" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "configuration_hash" CHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "cart_lines_pkey" PRIMARY KEY ("id"),
  -- A zero-quantity line is a removal, not a record.
  CONSTRAINT "cart_lines_quantity_check" CHECK ("quantity" BETWEEN 1 AND 20),
  CONSTRAINT "cart_lines_hash_check" CHECK ("configuration_hash" ~ '^[0-9a-f]{64}$')
);

ALTER TABLE "cart_lines"
  ADD CONSTRAINT "cart_lines_cart_id_fkey"
  FOREIGN KEY ("cart_id") REFERENCES "carts" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Restrict, never cascade: a cart line must not silently lose the exact approved
-- configuration it was built from.
ALTER TABLE "cart_lines"
  ADD CONSTRAINT "cart_lines_artwork_version_id_fkey"
  FOREIGN KEY ("artwork_version_id") REFERENCES "artwork_versions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cart_lines"
  ADD CONSTRAINT "cart_lines_garment_variant_id_fkey"
  FOREIGN KEY ("garment_variant_id") REFERENCES "garment_variants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cart_lines"
  ADD CONSTRAINT "cart_lines_placement_id_fkey"
  FOREIGN KEY ("placement_id") REFERENCES "garment_placements" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cart_lines"
  ADD CONSTRAINT "cart_lines_scale_preset_id_fkey"
  FOREIGN KEY ("scale_preset_id") REFERENCES "garment_scale_presets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Identical configurations merge onto one line instead of duplicating.
CREATE UNIQUE INDEX "cart_lines_cart_hash_key" ON "cart_lines" ("cart_id", "configuration_hash");
CREATE INDEX "cart_lines_cart_created_idx" ON "cart_lines" ("cart_id", "created_at");
