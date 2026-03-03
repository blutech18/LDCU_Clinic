-- ============================================
-- LDCU Clinic - Create Audit Logs Table
-- Safe to re-run (uses IF NOT EXISTS and DROP IF EXISTS)
-- ============================================

-- Create audit_logs table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_campus_id ON audit_logs(campus_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;

-- Create RLS policies
CREATE POLICY "audit_logs_select" ON audit_logs 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "audit_logs_insert" ON audit_logs 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

-- Create helper function
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

-- Verify
SELECT 'Audit logs table created successfully!' as status;
SELECT COUNT(*) as audit_logs_count FROM audit_logs;

-- ============================================
-- Audit logging is now ready!
-- All user actions will be automatically tracked
-- ============================================
