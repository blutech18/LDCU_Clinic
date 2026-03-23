-- ============================================================
-- LDCU Clinic — Fix Remaining RLS Policies
-- Addresses security issues #18 and #19
-- Safe to re-run. Run in Supabase SQL Editor.
-- ============================================================

-- ── Issue #18: booking_settings — Add DELETE policy ──────────────────────────
-- Only supervisors and admins should be able to delete booking settings

DROP POLICY IF EXISTS "booking_settings_delete" ON booking_settings;

CREATE POLICY "booking_settings_delete"
  ON booking_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('supervisor', 'admin')
    )
  );

-- ── Issue #19: departments — Require authentication for SELECT ───────────────
-- Currently allows anonymous SELECT. Should require authentication.

DROP POLICY IF EXISTS "departments_select_anon" ON departments;
DROP POLICY IF EXISTS "departments_select_authenticated" ON departments;

CREATE POLICY "departments_select_authenticated"
  ON departments
  FOR SELECT
  TO authenticated
  USING (true);

-- Also ensure INSERT/UPDATE/DELETE are restricted to admins only
DROP POLICY IF EXISTS "departments_insert" ON departments;
DROP POLICY IF EXISTS "departments_update" ON departments;
DROP POLICY IF EXISTS "departments_delete" ON departments;

CREATE POLICY "departments_insert"
  ON departments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "departments_update"
  ON departments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "departments_delete"
  ON departments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Verify
SELECT 'RLS policies updated successfully!' AS status;
