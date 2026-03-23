-- ============================================================
-- LDCU Clinic — Auto-update `updated_at` Triggers
-- Ensures updated_at is always set server-side on UPDATE,
-- instead of relying on the client to pass it.
--
-- Safe to re-run. Run in Supabase SQL Editor.
-- ============================================================

-- Generic trigger function for any table with updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- appointments
DROP TRIGGER IF EXISTS trg_appointments_updated_at ON appointments;
CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- profiles
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- email_templates
DROP TRIGGER IF EXISTS trg_email_templates_updated_at ON email_templates;
CREATE TRIGGER trg_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- schedule_config
DROP TRIGGER IF EXISTS trg_schedule_config_updated_at ON schedule_config;
CREATE TRIGGER trg_schedule_config_updated_at
  BEFORE UPDATE ON schedule_config
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- booking_settings
DROP TRIGGER IF EXISTS trg_booking_settings_updated_at ON booking_settings;
CREATE TRIGGER trg_booking_settings_updated_at
  BEFORE UPDATE ON booking_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Verify
SELECT 'updated_at triggers created successfully!' AS status;
