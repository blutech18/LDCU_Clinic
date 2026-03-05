-- ============================================
-- LDCU Clinic - Add 'dental' to appointment_type enum
-- Run this in your Supabase SQL Editor
-- ============================================

-- Safely add 'dental' to appointment_type enum (will only run if it doesn't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'dental'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_type')
  ) THEN
    ALTER TYPE appointment_type ADD VALUE 'dental';
    RAISE NOTICE 'Added ''dental'' to appointment_type enum.';
  ELSE
    RAISE NOTICE '''dental'' already exists in appointment_type enum. Skipping.';
  END IF;
END $$;
