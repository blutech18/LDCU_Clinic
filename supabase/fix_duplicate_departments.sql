-- Fix duplicate departments
-- This script removes duplicate department entries based on name only
-- Keeps one department per unique name (regardless of campus)

-- Step 1: Create a temporary table with unique departments by name (keeping the oldest one)
CREATE TEMP TABLE unique_departments AS
SELECT DISTINCT ON (name) 
  id, name, campus_id, created_at
FROM departments
ORDER BY name, created_at ASC;

-- Step 2: Delete duplicate departments (keep only the ones in unique_departments)
DELETE FROM departments
WHERE id NOT IN (SELECT id FROM unique_departments);

-- Step 3: Remove the campus-specific unique constraint if it exists
ALTER TABLE departments 
DROP CONSTRAINT IF EXISTS departments_name_campus_unique;

-- Step 4: Add a unique constraint on name only to prevent future duplicates
ALTER TABLE departments 
DROP CONSTRAINT IF EXISTS departments_name_unique;

ALTER TABLE departments 
ADD CONSTRAINT departments_name_unique 
UNIQUE (name);

-- Verify the fix - check for any remaining duplicates by name
SELECT name, COUNT(*) as count
FROM departments
GROUP BY name
HAVING COUNT(*) > 1;

-- Should return 0 rows if successful
SELECT COUNT(DISTINCT name) as unique_departments, COUNT(*) as total_departments
FROM departments;
