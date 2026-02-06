-- Seed LDCU Departments
-- Run this SQL in your Supabase SQL Editor
-- Make sure to replace 'YOUR_CAMPUS_ID' with the actual campus UUID from your campuses table

-- First, check your campus IDs:
-- SELECT id, name FROM campuses;

-- Then replace the campus_id below with the correct one.
-- If you have multiple campuses, duplicate the INSERT block for each campus.

-- Delete existing departments (optional, uncomment if needed)
-- DELETE FROM departments;

-- Insert all LDCU departments
-- Replace 'YOUR_CAMPUS_ID' with the actual UUID of your campus
DO $$
DECLARE
  campus_uuid UUID;
BEGIN
  -- Get the first campus ID (adjust if you have multiple campuses)
  SELECT id INTO campus_uuid FROM campuses LIMIT 1;

  IF campus_uuid IS NULL THEN
    RAISE EXCEPTION 'No campus found. Please create a campus first.';
  END IF;

  -- Delete existing departments for this campus
  DELETE FROM departments WHERE campus_id = campus_uuid;

  -- Higher Education - Colleges
  INSERT INTO departments (name, campus_id) VALUES
    ('College of Arts and Science', campus_uuid),
    ('School of Business, Management and Accountancy', campus_uuid),
    ('College of Criminal Justice', campus_uuid),
    ('College of Engineering', campus_uuid),
    ('College of Information Technology', campus_uuid),
    ('College of Medical Laboratory Science', campus_uuid),
    ('Conservatory of Music, Theater and Dance', campus_uuid),
    ('College of Nursing', campus_uuid),
    ('College of Dentistry', campus_uuid),
    ('College of Pharmacy', campus_uuid),
    ('College of Rehabilitation Sciences', campus_uuid),
    ('College of Radiologic Technology', campus_uuid),
    ('School of Teacher Education', campus_uuid),

  -- Basic Education
    ('Junior High School', campus_uuid),
    ('Senior High School', campus_uuid),

  -- Post Graduate
    ('Graduate Studies', campus_uuid);

END $$;

-- Verify
SELECT id, name, campus_id FROM departments ORDER BY name;
