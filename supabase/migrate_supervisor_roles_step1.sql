    -- ============================================
-- LDCU Clinic - Supervisor Role Migration - STEP 1
-- ONLY adds 'supervisor' to user_role enum
-- Run this FIRST, then WAIT, then run step 2
-- ============================================

-- Add 'supervisor' to user_role enum
-- Note: This will error if 'supervisor' already exists - that's OK, just skip to step 2
ALTER TYPE user_role ADD VALUE 'supervisor';

-- Verify the enum was updated
SELECT unnest(enum_range(NULL::user_role)) as available_roles;

-- ============================================
-- STOP HERE! 
-- After this completes successfully, run step 2
-- If you get "already exists" error, that's fine - proceed to step 2
-- ============================================
