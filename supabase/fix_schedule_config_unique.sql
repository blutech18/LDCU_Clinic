-- ============================================================
-- Diagnose + Fix schedule_config save issue
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Check if campus_id has a unique constraint
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'schedule_config'
ORDER BY tc.constraint_type;

-- 2. Add unique constraint on campus_id if missing
ALTER TABLE schedule_config
  DROP CONSTRAINT IF EXISTS schedule_config_campus_id_key;

ALTER TABLE schedule_config
  ADD CONSTRAINT schedule_config_campus_id_key UNIQUE (campus_id);

-- 3. Test upsert directly
-- Replace the UUID below with a real campus id from your campuses table
-- SELECT id FROM campuses LIMIT 1;
-- Then uncomment:
-- UPDATE schedule_config SET include_saturday = true WHERE campus_id = '<your-campus-uuid>';

-- 4. Verify data after
SELECT c.name, sc.include_saturday, sc.include_sunday
FROM schedule_config sc
JOIN campuses c ON c.id = sc.campus_id
ORDER BY c.name;
