-- ============================================
-- Add 'pending' and 'hr' to user_role enum, add
-- requested_role + role_selected columns, and
-- change default role to 'pending' for new users
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add 'pending' to the user_role enum (safe to re-run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'pending'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE user_role ADD VALUE 'pending';
  END IF;
END $$;

-- 2. Add 'hr' to the user_role enum (safe to re-run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'hr'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE user_role ADD VALUE 'hr';
  END IF;
END $$;

-- 3. Change the default role to 'pending' for new users
-- This ensures any new profile created (by trigger, manually, or by code)
-- will start as 'pending' instead of 'student'
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'pending';

-- 4. Add new columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS requested_role TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_selected BOOLEAN DEFAULT FALSE;

-- Force default to FALSE even if column already existed
ALTER TABLE profiles ALTER COLUMN role_selected SET DEFAULT FALSE;

-- 5. Mark ALL existing users as having already selected their role
-- so they are NOT forced through the role selection screen
UPDATE profiles SET role_selected = TRUE WHERE role_selected IS NULL;

-- Verify enum values
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
ORDER BY enumsortorder;

-- Verify columns and defaults
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name IN ('role', 'requested_role', 'role_selected');
