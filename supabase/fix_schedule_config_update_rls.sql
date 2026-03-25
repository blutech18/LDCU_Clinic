-- ============================================================
-- Fix RLS: Allow authenticated admins to UPDATE schedule_config
-- Run this in Supabase SQL Editor
-- ============================================================

-- Allow all authenticated users to SELECT schedule_config
DROP POLICY IF EXISTS "schedule_config_authenticated_select" ON schedule_config;
CREATE POLICY "schedule_config_authenticated_select"
  ON schedule_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users (admins/staff) to INSERT schedule_config
DROP POLICY IF EXISTS "schedule_config_authenticated_insert" ON schedule_config;
CREATE POLICY "schedule_config_authenticated_insert"
  ON schedule_config
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to UPDATE schedule_config
DROP POLICY IF EXISTS "schedule_config_authenticated_update" ON schedule_config;
CREATE POLICY "schedule_config_authenticated_update"
  ON schedule_config
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Verify policies
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'schedule_config'
ORDER BY policyname;

-- Verify current data
SELECT c.name, sc.include_saturday, sc.include_sunday
FROM schedule_config sc
JOIN campuses c ON c.id = sc.campus_id
ORDER BY c.name;
