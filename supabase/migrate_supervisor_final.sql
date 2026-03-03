-- ============================================
-- LDCU Clinic - Supervisor Role Migration (Final)
-- This migration checks the current state and adapts accordingly
-- Safe to run multiple times
-- ============================================

-- STEP 1: Check if user_role enum exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        -- Create the enum if it doesn't exist
        CREATE TYPE user_role AS ENUM ('student', 'staff', 'supervisor', 'nurse', 'doctor', 'admin');
        RAISE NOTICE 'Created user_role enum with all roles including supervisor';
    ELSE
        -- Enum exists, check if supervisor is already in it
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'supervisor' AND enumtypid = 'user_role'::regtype) THEN
            -- Add supervisor to existing enum
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'supervisor';
            RAISE NOTICE 'Added supervisor to existing user_role enum';
        ELSE
            RAISE NOTICE 'Supervisor role already exists in enum';
        END IF;
    END IF;
END $$;

-- IMPORTANT: Commit the transaction here before proceeding
-- In Supabase SQL Editor, this happens automatically after each statement block
-- Wait a moment, then run the next section

-- ============================================
-- STEP 2: Run this AFTER step 1 completes
-- (You can run both together in Supabase, but step 1 must finish first)
-- ============================================

-- Update existing employee records to supervisor (if column type allows it)
DO $$
BEGIN
    -- Only update if the role column exists and has employee values
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        -- Try to update employee to supervisor
        BEGIN
            UPDATE profiles SET role = 'supervisor' WHERE role = 'employee';
            RAISE NOTICE 'Updated % employee records to supervisor', (SELECT COUNT(*) FROM profiles WHERE role = 'supervisor');
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not update employee records (they may not exist or enum not ready): %', SQLERRM;
        END;
    END IF;
END $$;

-- Add assigned_campus_id column for nurse campus assignments
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS assigned_campus_id UUID REFERENCES campuses(id);

-- Create audit_logs table for supervisor monitoring
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  campus_id UUID REFERENCES campuses(id),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_campus_id ON audit_logs(campus_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);

-- Enable Row Level Security for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit_logs
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;

CREATE POLICY "audit_logs_select" ON audit_logs 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "audit_logs_insert" ON audit_logs 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

-- Create function to log user actions
CREATE OR REPLACE FUNCTION log_user_action(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_campus_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id, 
    campus_id, details, ip_address, user_agent
  ) VALUES (
    p_user_id, p_action, p_resource_type, p_resource_id,
    p_campus_id, p_details, p_ip_address, p_user_agent
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the migration
SELECT 'Migration completed!' as status;
SELECT unnest(enum_range(NULL::user_role)) as available_roles;
SELECT role, COUNT(*) as count FROM profiles GROUP BY role ORDER BY count DESC;
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') as audit_logs_created;
SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'assigned_campus_id') as nurse_assignment_ready;

-- ============================================
-- Usage Examples for Audit Logging:
-- ============================================
-- 
-- Log appointment creation:
-- SELECT log_user_action(
--   'user-uuid', 
--   'CREATE', 
--   'appointment', 
--   'appointment-uuid',
--   'campus-uuid',
--   '{"appointment_type": "consultation", "date": "2026-03-15"}'::jsonb
-- );
--
-- Log role change:
-- SELECT log_user_action(
--   'admin-uuid',
--   'UPDATE',
--   'user_role',
--   'target-user-uuid',
--   NULL,
--   '{"old_role": "nurse", "new_role": "supervisor"}'::jsonb
-- );
--
-- Log nurse campus assignment:
-- SELECT log_user_action(
--   'supervisor-uuid',
--   'ASSIGN',
--   'nurse_campus',
--   'nurse-uuid',
--   'campus-uuid',
--   '{"assigned_campus": "Main Campus"}'::jsonb
-- );
-- ============================================
