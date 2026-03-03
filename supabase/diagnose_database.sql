-- ============================================
-- LDCU Clinic - Database Diagnostic Script
-- Run this to check current database state
-- ============================================

-- 1. Check if user_role enum type exists
SELECT 
    'user_role enum exists' as check_name,
    EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'user_role'
    ) as result;

-- 2. List all values in user_role enum (if it exists)
SELECT 
    'Current user_role values' as info,
    enumlabel as role_value
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
ORDER BY enumsortorder;

-- 3. Check profiles table structure
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 4. Count users by role
SELECT 
    role,
    COUNT(*) as user_count
FROM profiles
GROUP BY role
ORDER BY user_count DESC;

-- 5. Check if audit_logs table exists
SELECT 
    'audit_logs table exists' as check_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'audit_logs'
    ) as result;

-- 6. Check if assigned_campus_id column exists in profiles
SELECT 
    'assigned_campus_id column exists' as check_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'assigned_campus_id'
    ) as result;

-- 7. List all custom enum types in database
SELECT 
    t.typname as enum_name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typtype = 'e'
GROUP BY t.typname
ORDER BY t.typname;

-- 8. Check campuses table
SELECT 
    'campuses table exists' as check_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'campuses'
    ) as result;

-- 9. List all campuses
SELECT id, name FROM campuses ORDER BY name;

-- ============================================
-- Summary: Run this entire script to see your
-- current database state before migration
-- ============================================
