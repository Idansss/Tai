-- CreateEnum
CREATE TYPE "SessionKind" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AuthAssuranceLevel" AS ENUM ('PASSWORD', 'MFA');

-- CreateEnum
CREATE TYPE "AdminMfaFactorStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "AdminAuthChallengePurpose" AS ENUM ('ENROLL_TOTP', 'VERIFY_TOTP');

-- AlterTable
ALTER TABLE "admin_profiles" ADD COLUMN "display_name" VARCHAR(100);

UPDATE "admin_profiles" AS profile
SET "display_name" = left(COALESCE(NULLIF(split_part("users"."email", '@', 1), ''), 'Staff'), 100)
FROM "users"
WHERE "users"."id" = profile."user_id";

ALTER TABLE "admin_profiles" ALTER COLUMN "display_name" SET NOT NULL;

-- AlterTable
ALTER TABLE "sessions"
    ADD COLUMN "kind" "SessionKind" NOT NULL DEFAULT 'CUSTOMER',
    ADD COLUMN "assurance_level" "AuthAssuranceLevel" NOT NULL DEFAULT 'PASSWORD',
    ADD COLUMN "mfa_verified_at" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "admin_mfa_factors" (
    "user_id" UUID NOT NULL,
    "status" "AdminMfaFactorStatus" NOT NULL DEFAULT 'PENDING',
    "secret_ciphertext" VARCHAR(1000) NOT NULL,
    "last_used_time_step" BIGINT,
    "verified_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admin_mfa_factors_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "admin_auth_challenges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "purpose" "AdminAuthChallengePurpose" NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "attempts_remaining" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_auth_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sessions_user_kind_state_idx" ON "sessions"("user_id", "kind", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "admin_mfa_factors_status_idx" ON "admin_mfa_factors"("status");

-- CreateIndex
CREATE UNIQUE INDEX "admin_auth_challenges_token_hash_key" ON "admin_auth_challenges"("token_hash");

-- CreateIndex
CREATE INDEX "admin_auth_challenges_user_state_idx" ON "admin_auth_challenges"("user_id", "consumed_at", "expires_at");

-- CreateIndex
CREATE INDEX "admin_auth_challenges_expires_at_idx" ON "admin_auth_challenges"("expires_at");

-- AddForeignKey
ALTER TABLE "admin_mfa_factors" ADD CONSTRAINT "admin_mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_auth_challenges" ADD CONSTRAINT "admin_auth_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add security and lifecycle invariants that Prisma cannot express.
ALTER TABLE "admin_profiles"
    ADD CONSTRAINT "admin_profiles_display_name_check"
    CHECK (btrim("display_name") <> '');

ALTER TABLE "sessions"
    ADD CONSTRAINT "sessions_assurance_check"
    CHECK (
        ("assurance_level" = 'PASSWORD' AND "mfa_verified_at" IS NULL)
        OR ("assurance_level" = 'MFA' AND "mfa_verified_at" IS NOT NULL)
    );

ALTER TABLE "admin_mfa_factors"
    ADD CONSTRAINT "admin_mfa_factors_lifecycle_check"
    CHECK (
        ("status" = 'PENDING' AND "verified_at" IS NULL AND "revoked_at" IS NULL)
        OR ("status" = 'ACTIVE' AND "verified_at" IS NOT NULL AND "revoked_at" IS NULL)
        OR ("status" = 'REVOKED' AND "revoked_at" IS NOT NULL)
    );

ALTER TABLE "admin_auth_challenges"
    ADD CONSTRAINT "admin_auth_challenges_expiry_check"
    CHECK ("expires_at" > "created_at"),
    ADD CONSTRAINT "admin_auth_challenges_consumed_time_check"
    CHECK (
        "consumed_at" IS NULL
        OR ("consumed_at" >= "created_at" AND "consumed_at" <= "expires_at")
    ),
    ADD CONSTRAINT "admin_auth_challenges_attempts_check"
    CHECK ("attempts_remaining" BETWEEN 0 AND 5);
