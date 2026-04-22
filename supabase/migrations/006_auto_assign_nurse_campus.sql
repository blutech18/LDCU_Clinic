-- ============================================
-- Auto-assign Main Campus to nurses on role change
-- When a profile's role is changed to 'nurse' and they have no
-- assigned_campus_id, automatically assign the first campus
-- (typically "Main Campus") as a default.
-- ============================================

-- Function: auto-assign campus when role becomes nurse
CREATE OR REPLACE FUNCTION auto_assign_nurse_campus()
RETURNS TRIGGER AS $$
DECLARE
  default_campus_id UUID;
BEGIN
  -- Only act when role changes TO 'nurse'
  IF NEW.role = 'nurse' AND (OLD.role IS DISTINCT FROM NEW.role) THEN
    -- If no campus is assigned yet, pick the first available campus
    IF NEW.assigned_campus_id IS NULL THEN
      SELECT id INTO default_campus_id FROM campuses ORDER BY created_at ASC, name ASC LIMIT 1;
      
      IF default_campus_id IS NOT NULL THEN
        NEW.assigned_campus_id := default_campus_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_auto_assign_nurse_campus ON profiles;

-- Attach trigger to profiles table (fires BEFORE UPDATE)
CREATE TRIGGER trg_auto_assign_nurse_campus
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_nurse_campus();

-- Also handle INSERT case (e.g., when a new profile is created with role='nurse')
DROP TRIGGER IF EXISTS trg_auto_assign_nurse_campus_insert ON profiles;

CREATE TRIGGER trg_auto_assign_nurse_campus_insert
  BEFORE INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'nurse' AND NEW.assigned_campus_id IS NULL)
  EXECUTE FUNCTION auto_assign_nurse_campus();

-- Backfill: assign first campus to any existing nurses without a campus
DO $$
DECLARE
  default_campus_id UUID;
BEGIN
  SELECT id INTO default_campus_id FROM campuses ORDER BY created_at ASC, name ASC LIMIT 1;
  
  IF default_campus_id IS NOT NULL THEN
    UPDATE profiles
    SET assigned_campus_id = default_campus_id
    WHERE role = 'nurse'
      AND assigned_campus_id IS NULL;
  END IF;
END $$;
