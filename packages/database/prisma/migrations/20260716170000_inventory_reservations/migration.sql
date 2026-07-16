CREATE TYPE "InventoryMovementKind" AS ENUM ('RECEIPT', 'ADJUSTMENT', 'SALE', 'RETURN', 'DAMAGE');
CREATE TYPE "InventoryReservationStatus" AS ENUM ('ACTIVE', 'RELEASED', 'COMMITTED', 'EXPIRED');

-- Stock is held against the blank garment variant, never against artwork.
CREATE TABLE "inventory_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "variant_id" UUID NOT NULL,
  "on_hand" INTEGER NOT NULL DEFAULT 0,
  "low_stock_threshold" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id"),
  -- Stock can never go negative. This is the last line of defence behind the application's
  -- row-locked reservation path: even a direct database write cannot oversell.
  CONSTRAINT "inventory_items_on_hand_check" CHECK ("on_hand" >= 0),
  CONSTRAINT "inventory_items_threshold_check" CHECK ("low_stock_threshold" >= 0)
);

ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_variant_id_fkey"
  FOREIGN KEY ("variant_id") REFERENCES "garment_variants" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "inventory_items_variant_id_key" ON "inventory_items" ("variant_id");

-- Append-only ledger of every change to on-hand stock.
CREATE TABLE "inventory_movements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "item_id" UUID NOT NULL,
  "kind" "InventoryMovementKind" NOT NULL,
  "quantity_delta" INTEGER NOT NULL,
  "on_hand_after" INTEGER NOT NULL,
  "reason" VARCHAR(500),
  "reference" VARCHAR(200),
  "created_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id"),
  -- A movement that moves nothing is a bug, not a record.
  CONSTRAINT "inventory_movements_delta_check" CHECK ("quantity_delta" <> 0),
  CONSTRAINT "inventory_movements_on_hand_after_check" CHECK ("on_hand_after" >= 0),
  -- Stock leaves only through a sale or damage, and arrives only through a receipt or return.
  CONSTRAINT "inventory_movements_direction_check" CHECK (
    ("kind" IN ('RECEIPT', 'RETURN') AND "quantity_delta" > 0)
    OR ("kind" IN ('SALE', 'DAMAGE') AND "quantity_delta" < 0)
    OR "kind" = 'ADJUSTMENT'
  ),
  -- An adjustment is a human decision and must say why.
  CONSTRAINT "inventory_movements_reason_check" CHECK (
    "kind" <> 'ADJUSTMENT' OR ("reason" IS NOT NULL AND btrim("reason") <> '')
  )
);

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_item_id_fkey"
  FOREIGN KEY ("item_id") REFERENCES "inventory_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "inventory_movements_item_created_at_idx" ON "inventory_movements" ("item_id", "created_at");

-- The ledger is append-only: stock history can be audited but never rewritten.
CREATE FUNCTION tms_prevent_inventory_movement_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'inventory_movements is append-only';
END;
$$;

CREATE TRIGGER "inventory_movements_prevent_update_delete"
BEFORE UPDATE OR DELETE ON "inventory_movements"
FOR EACH ROW EXECUTE FUNCTION tms_prevent_inventory_movement_mutation();

-- An expiring hold on stock. Available = on_hand - SUM(quantity) of unexpired ACTIVE rows.
CREATE TABLE "inventory_reservations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "item_id" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" "InventoryReservationStatus" NOT NULL DEFAULT 'ACTIVE',
  "reference" VARCHAR(200) NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "released_at" TIMESTAMPTZ(3),
  "committed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_reservations_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "inventory_reservations_reference_check" CHECK (btrim("reference") <> ''),
  -- A terminal state must record when it happened, and a live one must not claim to have.
  CONSTRAINT "inventory_reservations_lifecycle_check" CHECK (
    ("status" = 'COMMITTED' AND "committed_at" IS NOT NULL AND "released_at" IS NULL)
    OR ("status" = 'RELEASED' AND "released_at" IS NOT NULL AND "committed_at" IS NULL)
    OR ("status" IN ('ACTIVE', 'EXPIRED') AND "committed_at" IS NULL AND "released_at" IS NULL)
  )
);

ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT "inventory_reservations_item_id_fkey"
  FOREIGN KEY ("item_id") REFERENCES "inventory_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Supports the availability sum and the expiry sweep on the hot reservation path.
CREATE INDEX "inventory_reservations_item_status_expires_idx"
  ON "inventory_reservations" ("item_id", "status", "expires_at");

CREATE INDEX "inventory_reservations_reference_idx" ON "inventory_reservations" ("reference");
