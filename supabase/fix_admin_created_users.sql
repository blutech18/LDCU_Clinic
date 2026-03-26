-- Fix admin-created users that have a role but role_selected is false
-- This ensures they don't get redirected to role selection page

UPDATE profiles
SET role_selected = true
WHERE role != 'pending' 
  AND role IS NOT NULL
  AND (role_selected = false OR role_selected IS NULL)
  AND is_verified = true;
