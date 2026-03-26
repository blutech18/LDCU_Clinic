-- Remove "doctor" and "employee" roles from the system
-- This script will:
-- 1. Change all users with "doctor" or "employee" role to "staff" role
-- 2. Update any requested_role from "doctor" or "employee" to "staff"

-- Update existing doctor and employee users to staff
UPDATE profiles
SET role = 'staff'
WHERE role IN ('doctor', 'employee');

-- Update any pending doctor or employee requests to staff
UPDATE profiles
SET requested_role = 'staff'
WHERE requested_role IN ('doctor', 'employee');

-- Note: You may also need to update the role enum constraint in your database
-- if it exists. This would require altering the table constraint.
