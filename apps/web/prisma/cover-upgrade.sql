-- Additive upgrade: preserve all existing accounts, products and blockchain records.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "coverUrl" TEXT;
