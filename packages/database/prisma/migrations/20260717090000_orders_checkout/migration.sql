-- TMS-B4-003: checkout, guest orders, immutable order snapshots, and an audited order state
-- machine. Every money amount is an integer copy taken at placement (ADR-015, ADR-018) and the
-- status history is append-only (mirrors the inventory ledger).

CREATE TYPE "OrderStatus" AS ENUM (
  'DRAFT',
  'AWAITING_PAYMENT',
  'PAYMENT_PROCESSING',
  'PAID',
  'PRODUCTION_QUEUED',
  'PRINTING',
  'QUALITY_CHECK',
  'READY_FOR_DISPATCH',
  'SHIPMENT_BOOKED',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'PAYMENT_FAILED',
  'PAYMENT_CANCELLED',
  'CANCEL_REQUESTED',
  'CANCELLED',
  'REFUND_PENDING',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'DELIVERY_EXCEPTION',
  'RETURN_REQUESTED',
  'RETURN_APPROVED',
  'RETURN_IN_TRANSIT',
  'RETURNED'
);

CREATE TYPE "DeliveryMethod" AS ENUM ('STANDARD', 'EXPRESS');

CREATE TABLE "orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reference" VARCHAR(20) NOT NULL,
  "user_id" UUID,
  "status" "OrderStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
  "idempotency_key" VARCHAR(120),
  "contact_email" VARCHAR(320) NOT NULL,
  "normalized_email" VARCHAR(320) NOT NULL,
  "contact_name" VARCHAR(200) NOT NULL,
  "contact_phone" VARCHAR(20),
  "address_state" VARCHAR(100) NOT NULL,
  "address_city" VARCHAR(120) NOT NULL,
  "address_line1" VARCHAR(200) NOT NULL,
  "address_line2" VARCHAR(200),
  "address_postcode" VARCHAR(20),
  "delivery_method" "DeliveryMethod" NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "subtotal_minor" INTEGER NOT NULL,
  "discount_minor" INTEGER NOT NULL DEFAULT 0,
  "delivery_minor" INTEGER NOT NULL,
  "tax_minor" INTEGER NOT NULL,
  "total_minor" INTEGER NOT NULL,
  "promotion_code" VARCHAR(64),
  "promotion_label" VARCHAR(120),
  "placed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paid_at" TIMESTAMPTZ(3),
  "cancelled_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orders_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  -- Money is integer minor units and never negative. Totals are integer arithmetic and the
  -- stored total must equal the components it was computed from, so a corrupt row is rejected
  -- rather than quietly billed.
  CONSTRAINT "orders_amounts_check" CHECK (
    "subtotal_minor" >= 0 AND "discount_minor" >= 0 AND "delivery_minor" >= 0
    AND "tax_minor" >= 0 AND "total_minor" >= 0
  ),
  CONSTRAINT "orders_discount_check" CHECK ("discount_minor" <= "subtotal_minor"),
  CONSTRAINT "orders_total_check" CHECK (
    "total_minor" = "subtotal_minor" - "discount_minor" + "delivery_minor" + "tax_minor"
  ),
  -- A priced order must carry at least one line's worth of money, so an empty cart can never
  -- reach an order row.
  CONSTRAINT "orders_subtotal_positive_check" CHECK ("subtotal_minor" > 0)
);

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "orders_reference_key" ON "orders" ("reference");
-- A caller-supplied idempotency key is unique per customer, so a retried checkout collapses onto
-- the order it already placed. Guest orders (null user) are excluded from the guard by design;
-- they are deduplicated by the emptied cart instead.
CREATE UNIQUE INDEX "orders_user_idempotency_key"
  ON "orders" ("user_id", "idempotency_key")
  WHERE "user_id" IS NOT NULL AND "idempotency_key" IS NOT NULL;
CREATE INDEX "orders_user_placed_at_idx" ON "orders" ("user_id", "placed_at");
CREATE INDEX "orders_email_placed_at_idx" ON "orders" ("normalized_email", "placed_at");
CREATE INDEX "orders_status_placed_at_idx" ON "orders" ("status", "placed_at");

CREATE TABLE "order_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "artwork_version_id" UUID NOT NULL,
  "garment_variant_id" UUID NOT NULL,
  "placement_id" UUID NOT NULL,
  "scale_preset_id" UUID NOT NULL,
  "view" "GarmentView" NOT NULL,
  "configuration_hash" CHAR(64) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price_minor" INTEGER NOT NULL,
  "line_total_minor" INTEGER NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "artwork_title" VARCHAR(200) NOT NULL,
  "garment_title" VARCHAR(200) NOT NULL,
  "colour_name" VARCHAR(100) NOT NULL,
  "size_label" VARCHAR(100) NOT NULL,
  "sku" VARCHAR(80) NOT NULL,
  "reservation_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_items_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "order_items_quantity_check" CHECK ("quantity" > 0 AND "quantity" <= 100),
  CONSTRAINT "order_items_unit_price_check" CHECK ("unit_price_minor" > 0),
  -- The stored line total is the copied unit price times the quantity, in integer minor units.
  CONSTRAINT "order_items_line_total_check" CHECK ("line_total_minor" = "unit_price_minor" * "quantity")
);

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_artwork_version_id_fkey"
  FOREIGN KEY ("artwork_version_id") REFERENCES "artwork_versions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_garment_variant_id_fkey"
  FOREIGN KEY ("garment_variant_id") REFERENCES "garment_variants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_placement_id_fkey"
  FOREIGN KEY ("placement_id") REFERENCES "garment_placements" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_scale_preset_id_fkey"
  FOREIGN KEY ("scale_preset_id") REFERENCES "garment_scale_presets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "order_items_order_idx" ON "order_items" ("order_id");

CREATE TABLE "order_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "from_status" "OrderStatus",
  "to_status" "OrderStatus" NOT NULL,
  "reason" VARCHAR(500),
  "actor_type" "AuditActorType" NOT NULL DEFAULT 'SYSTEM',
  "actor_user_id" UUID,
  "correlation_id" VARCHAR(128) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "order_events"
  ADD CONSTRAINT "order_events_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "order_events_order_created_idx" ON "order_events" ("order_id", "created_at");

-- The status history is append-only: an order's lifecycle can be replayed but never rewritten.
CREATE FUNCTION tms_prevent_order_event_mutation() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'order_events is append-only';
END;
$$;

CREATE TRIGGER "order_events_prevent_update_delete"
BEFORE UPDATE OR DELETE ON "order_events"
FOR EACH ROW EXECUTE FUNCTION tms_prevent_order_event_mutation();
