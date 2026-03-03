-- ============================================
-- LDCU Clinic - Cleanup Old Roles
-- Migrate doctor and employee to supervisor
-- ============================================

-- 1. Check current role distribution
SELECT 'Current roles before cleanup:' as info;
SELECT role, COUNT(*) as count FROM profiles GROUP BY role ORDER BY role;

-- 2. Update doctor records to supervisor
UPDATE profiles SET role = 'supervisor' WHERE role = 'doctor';

-- 3. Update employee records to supervisor (if any remain)
UPDATE profiles SET role = 'supervisor' WHERE role = 'employee';

-- 4. Verify the cleanup
SELECT 'Roles after cleanup:' as info;
SELECT role, COUNT(*) as count FROM profiles GROUP BY role ORDER BY role;

-- 5. Show which roles are still in the enum (but doctor/employee won't be used)
SELECT 'All enum values (doctor/employee will remain but unused):' as info;
SELECT unnest(enum_range(NULL::user_role)) as role_value;

-- ============================================
-- Note: PostgreSQL doesn't support removing enum values
-- The old 'doctor' and 'employee' values will remain in the enum
-- but no records will use them after this migration
-- ============================================
