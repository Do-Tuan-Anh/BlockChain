-- Existing profiles skip onboarding; new users start with NULL.
-- The temporary default backfills existing rows only on first application.
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'profileSetupAt'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "profileSetupAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "users" ALTER COLUMN "profileSetupAt" DROP DEFAULT;
  END IF;
END $$;
