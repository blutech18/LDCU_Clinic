-- ============================================================
-- LDCU Clinic — Session Invalidation on Role Change
-- Forces re-authentication when a user's role is changed by
-- an admin or HR. This prevents stale sessions from retaining
-- the old role's permissions.
--
-- How it works:
-- 1. A trigger fires AFTER UPDATE on profiles.role
-- 2. It sets a `force_reauth_at` timestamp
-- 3. The frontend checks this timestamp on each protected
--    route and logs the user out if it's newer than their
--    last auth time.
--
-- Safe to re-run. Run in Supabase SQL Editor.
-- ============================================================

-- 1. Add force_reauth_at column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS force_reauth_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create or replace the trigger function
CREATE OR REPLACE FUNCTION on_role_changed()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when the role column actually changes
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    NEW.force_reauth_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger to profiles table
DROP TRIGGER IF EXISTS trg_role_changed ON profiles;
CREATE TRIGGER trg_role_changed
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION on_role_changed();

-- Verify
SELECT 'Session invalidation trigger created successfully!' AS status;
