-- ============================================================
-- LDCU Clinic — Production RLS Policy Fix
-- Safe to re-run. Run in Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- HELPER: Check if user has a specific role (uses auth.uid())
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_campus_id()
RETURNS UUID AS $$
  SELECT campus_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================
-- 1. email_templates
--    SELECT:        any authenticated user
--    INSERT/UPDATE/DELETE:
--      - admin:      all campuses
--      - supervisor: all campuses
--      - nurse:      their campus only (campus_id must match)
-- ============================================================
DROP POLICY IF EXISTS "email_templates_select"  ON email_templates;
DROP POLICY IF EXISTS "email_templates_insert"  ON email_templates;
DROP POLICY IF EXISTS "email_templates_update"  ON email_templates;
DROP POLICY IF EXISTS "email_templates_delete"  ON email_templates;

CREATE POLICY "email_templates_select" ON email_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "email_templates_insert" ON email_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() IN ('admin', 'supervisor')
    OR (get_my_role() = 'nurse' AND campus_id = get_my_campus_id())
  );

CREATE POLICY "email_templates_update" ON email_templates
  FOR UPDATE TO authenticated
  USING (
    get_my_role() IN ('admin', 'supervisor')
    OR (get_my_role() = 'nurse' AND campus_id = get_my_campus_id())
  )
  WITH CHECK (
    get_my_role() IN ('admin', 'supervisor')
    OR (get_my_role() = 'nurse' AND campus_id = get_my_campus_id())
  );

CREATE POLICY "email_templates_delete" ON email_templates
  FOR DELETE TO authenticated
  USING (
    get_my_role() IN ('admin', 'supervisor')
    OR (get_my_role() = 'nurse' AND campus_id = get_my_campus_id())
  );


-- ============================================================
-- 2. schedule_config
--    SELECT:        any authenticated user
--    INSERT/UPDATE/DELETE: admin and supervisor only
-- ============================================================
DROP POLICY IF EXISTS "schedule_config_select"  ON schedule_config;
DROP POLICY IF EXISTS "schedule_config_insert"  ON schedule_config;
DROP POLICY IF EXISTS "schedule_config_update"  ON schedule_config;
DROP POLICY IF EXISTS "schedule_config_delete"  ON schedule_config;

CREATE POLICY "schedule_config_select" ON schedule_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "schedule_config_insert" ON schedule_config
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'supervisor'));

CREATE POLICY "schedule_config_update" ON schedule_config
  FOR UPDATE TO authenticated
  USING (get_my_role() IN ('admin', 'supervisor'))
  WITH CHECK (get_my_role() IN ('admin', 'supervisor'));

CREATE POLICY "schedule_config_delete" ON schedule_config
  FOR DELETE TO authenticated
  USING (get_my_role() IN ('admin', 'supervisor'));


-- ============================================================
-- 3. booking_settings
--    SELECT:        any authenticated user
--    INSERT/UPDATE/DELETE: admin and supervisor only
-- ============================================================
DROP POLICY IF EXISTS "booking_settings_select"  ON booking_settings;
DROP POLICY IF EXISTS "booking_settings_insert"  ON booking_settings;
DROP POLICY IF EXISTS "booking_settings_update"  ON booking_settings;
DROP POLICY IF EXISTS "booking_settings_delete"  ON booking_settings;

CREATE POLICY "booking_settings_select" ON booking_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "booking_settings_insert" ON booking_settings
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'supervisor'));

CREATE POLICY "booking_settings_update" ON booking_settings
  FOR UPDATE TO authenticated
  USING (get_my_role() IN ('admin', 'supervisor'))
  WITH CHECK (get_my_role() IN ('admin', 'supervisor'));

CREATE POLICY "booking_settings_delete" ON booking_settings
  FOR DELETE TO authenticated
  USING (get_my_role() IN ('admin', 'supervisor'));


-- ============================================================
-- 4. audit_logs
--    SELECT:  admin and supervisor only
--    INSERT:  any authenticated user (logging own actions)
-- ============================================================
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;

CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT TO authenticated
  USING (get_my_role() IN ('admin', 'supervisor'));

CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);


-- ============================================================
-- 5. Fix log_user_action — use auth.uid() server-side
--    instead of trusting the p_user_id from the client.
--    This prevents forging audit logs for other users.
-- ============================================================
CREATE OR REPLACE FUNCTION log_user_action(
  p_action       TEXT,
  p_resource_type TEXT,
  p_resource_id  TEXT    DEFAULT NULL,
  p_campus_id    UUID    DEFAULT NULL,
  p_details      JSONB   DEFAULT NULL,
  p_ip_address   INET    DEFAULT NULL,
  p_user_agent   TEXT    DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id,
    campus_id, details, ip_address, user_agent
  ) VALUES (
    auth.uid(),        -- always the calling user, never from client
    p_action, p_resource_type, p_resource_id,
    p_campus_id, p_details, p_ip_address, p_user_agent
  ) RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 6. Performance indexes on appointments table
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_appointments_campus_date
  ON appointments(campus_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_status
  ON appointments(status);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_email
  ON appointments(patient_email);

CREATE INDEX IF NOT EXISTS idx_appointments_booker_role
  ON appointments(booker_role);


-- ============================================================
-- Verify
-- ============================================================
SELECT 'RLS policies updated successfully!' AS status;
