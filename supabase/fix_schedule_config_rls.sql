-- ============================================
-- Complete Fix for Schedule Config 406 Error
-- Run this script in your Supabase SQL Editor
-- ============================================

-- 1. Add public read policy for schedule_config
DROP POLICY IF EXISTS "schedule_config_public_select" ON schedule_config;
CREATE POLICY "schedule_config_public_select" 
  ON schedule_config 
  FOR SELECT 
  TO anon 
  USING (true);

-- 2. Also update booking_settings to allow public read
DROP POLICY IF EXISTS "booking_settings_public_select" ON booking_settings;
CREATE POLICY "booking_settings_public_select" 
  ON booking_settings 
  FOR SELECT 
  TO anon 
  USING (true);

-- 3. Seed default schedule config for all campuses if not exists
INSERT INTO schedule_config (campus_id, include_saturday, include_sunday, holiday_dates)
SELECT 
  c.id,
  false, -- Don't include Saturday by default
  false, -- Don't include Sunday by default
  ARRAY[]::TEXT[] -- Empty holiday dates array
FROM campuses c
WHERE NOT EXISTS (
  SELECT 1 FROM schedule_config sc WHERE sc.campus_id = c.id
);

-- 4. Seed default booking settings for all campuses if not exists
INSERT INTO booking_settings (campus_id, max_bookings_per_day)
SELECT 
  c.id,
  50 -- Default max bookings per day
FROM campuses c
WHERE NOT EXISTS (
  SELECT 1 FROM booking_settings bs WHERE bs.campus_id = c.id
);

-- 5. Verify the setup
SELECT 
  'schedule_config' as table_name,
  c.name as campus_name,
  sc.include_saturday,
  sc.include_sunday,
  array_length(sc.holiday_dates, 1) as holiday_count
FROM schedule_config sc
JOIN campuses c ON c.id = sc.campus_id
ORDER BY c.name;

SELECT 
  'booking_settings' as table_name,
  c.name as campus_name,
  bs.max_bookings_per_day
FROM booking_settings bs
JOIN campuses c ON c.id = bs.campus_id
ORDER BY c.name;

-- 6. Verify RLS policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('schedule_config', 'booking_settings')
ORDER BY tablename, policyname;
