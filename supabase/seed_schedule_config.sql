-- ============================================
-- Seed Schedule Config Data
-- Create default schedule configuration for all campuses
-- ============================================

-- Insert default schedule config for each campus if not exists
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

-- Verify
SELECT 
  sc.id,
  c.name as campus_name,
  sc.include_saturday,
  sc.include_sunday,
  sc.holiday_dates,
  sc.created_at
FROM schedule_config sc
JOIN campuses c ON c.id = sc.campus_id
ORDER BY c.name;
