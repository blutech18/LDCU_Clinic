-- ============================================================
-- LDCU Clinic — Login Rate Limiting (Brute Force Protection)
-- Addresses security issue #11
-- Prevents brute force attacks by limiting login attempts
-- Safe to re-run. Run in Supabase SQL Editor.
-- ============================================================

-- ── Create login_attempts table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by email and time
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time 
  ON login_attempts(email, attempted_at DESC);

-- ── RLS Policies (service role only) ─────────────────────────────────────────
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- No user access - only service role can write to this table
DROP POLICY IF EXISTS "login_attempts_no_access" ON login_attempts;
CREATE POLICY "login_attempts_no_access"
  ON login_attempts
  FOR ALL
  TO authenticated
  USING (false);

-- ── Function to check if login is rate limited ───────────────────────────────
CREATE OR REPLACE FUNCTION check_login_rate_limit(
  p_email TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts_15min INT;
  v_attempts_1hour INT;
  v_last_attempt TIMESTAMPTZ;
  v_lockout_until TIMESTAMPTZ;
BEGIN
  -- Count failed attempts in last 15 minutes
  SELECT count(*) INTO v_attempts_15min
  FROM login_attempts
  WHERE email = p_email
    AND success = FALSE
    AND attempted_at > NOW() - INTERVAL '15 minutes';

  -- Count failed attempts in last 1 hour
  SELECT count(*) INTO v_attempts_1hour
  FROM login_attempts
  WHERE email = p_email
    AND success = FALSE
    AND attempted_at > NOW() - INTERVAL '1 hour';

  -- Get last attempt time
  SELECT attempted_at INTO v_last_attempt
  FROM login_attempts
  WHERE email = p_email
  ORDER BY attempted_at DESC
  LIMIT 1;

  -- Rate limit rules:
  -- 1. More than 5 failed attempts in 15 minutes → locked for 15 minutes
  -- 2. More than 10 failed attempts in 1 hour → locked for 1 hour
  
  IF v_attempts_15min >= 5 THEN
    v_lockout_until := v_last_attempt + INTERVAL '15 minutes';
    IF NOW() < v_lockout_until THEN
      RETURN json_build_object(
        'allowed', false,
        'reason', 'too_many_attempts',
        'lockout_until', v_lockout_until,
        'attempts_15min', v_attempts_15min,
        'attempts_1hour', v_attempts_1hour
      );
    END IF;
  END IF;

  IF v_attempts_1hour >= 10 THEN
    v_lockout_until := v_last_attempt + INTERVAL '1 hour';
    IF NOW() < v_lockout_until THEN
      RETURN json_build_object(
        'allowed', false,
        'reason', 'too_many_attempts',
        'lockout_until', v_lockout_until,
        'attempts_15min', v_attempts_15min,
        'attempts_1hour', v_attempts_1hour
      );
    END IF;
  END IF;

  -- Login allowed
  RETURN json_build_object(
    'allowed', true,
    'attempts_15min', v_attempts_15min,
    'attempts_1hour', v_attempts_1hour
  );
END;
$$;

-- ── Function to record login attempt ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION record_login_attempt(
  p_email TEXT,
  p_success BOOLEAN,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO login_attempts (email, ip_address, success, attempted_at)
  VALUES (p_email, p_ip_address, p_success, NOW());

  -- Clean up old records (older than 7 days)
  DELETE FROM login_attempts
  WHERE attempted_at < NOW() - INTERVAL '7 days';
END;
$$;

-- ── Grant execute permissions ────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION check_login_rate_limit TO authenticated, anon;
GRANT EXECUTE ON FUNCTION record_login_attempt TO authenticated, anon;

-- ── Cleanup job (optional - run periodically) ────────────────────────────────
-- You can set up a cron job in Supabase to run this weekly:
-- SELECT cron.schedule('cleanup-login-attempts', '0 0 * * 0', 'DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL ''7 days''');

-- Verify
SELECT 'Login rate limiting created successfully!' AS status;
