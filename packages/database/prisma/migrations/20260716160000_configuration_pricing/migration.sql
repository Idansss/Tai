-- Price belongs to the approved artwork and garment pair (ADR-015).
-- Money is an integer amount in minor units (kobo) with an explicit ISO-4217 currency.
-- Floating point is never used for money.
ALTER TABLE "artwork_garment_compatibilities"
  ADD COLUMN "unit_price_minor" INTEGER,
  ADD COLUMN "currency" CHAR(3);

-- An approved combination must be priced and a non-approved one must not carry a price,
-- so there is no way to sell a configuration an administrator did not both approve and price.
ALTER TABLE "artwork_garment_compatibilities"
  ADD CONSTRAINT "artwork_garment_compatibilities_price_check" CHECK (
    ("status" = 'APPROVED' AND "unit_price_minor" IS NOT NULL AND "currency" IS NOT NULL)
    OR ("status" <> 'APPROVED' AND "unit_price_minor" IS NULL AND "currency" IS NULL)
  );

-- Positive, bounded, and integral. The upper bound is a deliberate tripwire against a
-- mis-entered amount reaching checkout: 100,000,000 kobo is 1,000,000 naira.
ALTER TABLE "artwork_garment_compatibilities"
  ADD CONSTRAINT "artwork_garment_compatibilities_price_range_check" CHECK (
    "unit_price_minor" IS NULL OR ("unit_price_minor" > 0 AND "unit_price_minor" <= 100000000)
  );

ALTER TABLE "artwork_garment_compatibilities"
  ADD CONSTRAINT "artwork_garment_compatibilities_currency_check" CHECK (
    "currency" IS NULL OR "currency" ~ '^[A-Z]{3}$'
  );
