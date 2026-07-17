-- TMS-B5-001: payments behind a provider-neutral port. A payment attempt records the gateway's
-- own reference and money in integer minor units; every raw provider event is stored append-only
-- and deduplicated by (provider, provider_event_id) so a replayed webhook is a no-op.

CREATE TYPE "PaymentStatus" AS ENUM (
  'CREATED',
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'REVERSED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'DISPUTED'
);

CREATE TABLE "payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "provider" VARCHAR(40) NOT NULL,
  "provider_reference" VARCHAR(200) NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amount_minor" INTEGER NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "refunded_minor" INTEGER NOT NULL DEFAULT 0,
  "redirect_url" VARCHAR(2000),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payments_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "payments_amount_check" CHECK ("amount_minor" > 0),
  -- A refund can never exceed what was charged.
  CONSTRAINT "payments_refunded_check" CHECK ("refunded_minor" >= 0 AND "refunded_minor" <= "amount_minor")
);

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "payments_provider_reference_key" ON "payments" ("provider_reference");
CREATE INDEX "payments_order_created_idx" ON "payments" ("order_id", "created_at");

CREATE TABLE "payment_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payment_id" UUID NOT NULL,
  "provider" VARCHAR(40) NOT NULL,
  "provider_event_id" VARCHAR(200) NOT NULL,
  "type" VARCHAR(80) NOT NULL,
  "status" "PaymentStatus" NOT NULL,
  "amount_minor" INTEGER,
  "payload" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "payment_events"
  ADD CONSTRAINT "payment_events_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A replayed webhook carries the same provider event id and is rejected here, so the same event
-- is processed exactly once.
CREATE UNIQUE INDEX "payment_events_provider_event_key"
  ON "payment_events" ("provider", "provider_event_id");
CREATE INDEX "payment_events_payment_created_idx"
  ON "payment_events" ("payment_id", "created_at");

-- The provider-event record is append-only: what a provider told us can be replayed but never
-- rewritten.
CREATE FUNCTION tms_prevent_payment_event_mutation() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'payment_events is append-only';
END;
$$;

CREATE TRIGGER "payment_events_prevent_update_delete"
BEFORE UPDATE OR DELETE ON "payment_events"
FOR EACH ROW EXECUTE FUNCTION tms_prevent_payment_event_mutation();
