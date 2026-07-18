-- Drops: a manual sold-out flag, a tagline, and an early-access window (TMS-FBR-018).
-- Pieces are printed made-to-order and never sell out on their own, so `sold_out` is an
-- administrator-controlled flag for a deliberately closed run, not a derived stock state.
ALTER TABLE "drops"
  ADD COLUMN "tagline" VARCHAR(240),
  ADD COLUMN "early_access_at" TIMESTAMPTZ(3),
  ADD COLUMN "sold_out" BOOLEAN NOT NULL DEFAULT false;

-- Early access, when set, must not open after the public release.
ALTER TABLE "drops"
  ADD CONSTRAINT "drops_early_access_check" CHECK (
    "early_access_at" IS NULL OR "starts_at" IS NULL OR "early_access_at" <= "starts_at"
  );

-- Stories: an editorial category (TMS-FBR-019).
ALTER TABLE "stories" ADD COLUMN "category" VARCHAR(80);

-- A shoppable story block links products/artworks. StorySummary.shoppableCount counts these.
-- Added as a value only; it is not used in this migration, so it is safe inside the transaction.
ALTER TYPE "StoryBlockType" ADD VALUE 'SHOPPABLE';
