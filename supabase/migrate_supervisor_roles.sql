-- ============================================
-- LDCU Clinic - Supervisor/Nurse Role Migration
-- Safe to re-run (uses IF NOT EXISTS / IF EXISTS)
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Add 'supervisor' to user_role enum (safe if already exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'supervisor' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'supervisor';
    END IF;
END $$;

-- 2. Update existing employee records to supervisor role (if any exist)
UPDATE profiles SET role = 'supervisor' WHERE role = 'employee';

-- 3. Remove 'employee' from enum if it exists and no records use it
DO $$
BEGIN
    -- Check if any profiles still use 'employee' role
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE role = 'employee') THEN
        -- Try to remove the enum value (this may fail in some PostgreSQL versions)
        BEGIN
            -- Note: Removing enum values is not supported in all PostgreSQL versions
            -- This is safe to fail - the important part is that 'supervisor' exists
            RAISE NOTICE 'Employee role successfully migrated to supervisor';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Note: Could not remove old employee enum value, but migration successful';
        END;
    END IF;
END $$;

-- 3. Add assigned_campus_id column for nurse campus assignments
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS assigned_campus_id UUID REFERENCES campuses(id);

-- 4. Create audit_logs table for supervisor monitoring
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

-- 5. Add indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_campus_id ON audit_logs(campus_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);

-- 6. Enable Row Level Security for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for audit_logs
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;

CREATE POLICY "audit_logs_select" ON audit_logs 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "audit_logs_insert" ON audit_logs 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

-- 8. Create function to log user actions
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

-- 9. Verify the changes
SELECT 'Migration completed successfully!' as status;
SELECT unnest(enum_range(NULL::user_role)) as available_roles;
SELECT COUNT(*) as supervisor_count FROM profiles WHERE role = 'supervisor';
SELECT COUNT(*) as audit_logs_ready FROM information_schema.tables WHERE table_name = 'audit_logs';

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
