-- ============================================================
-- LDCU Clinic — Scheduled Cleanup Jobs
-- Prevents unbounded growth of login_attempts and
-- processes pending_emails queue.
--
-- Requires pg_cron extension (enabled by default on Supabase).
-- Safe to re-run. Run in Supabase SQL Editor.
-- ============================================================

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Clean up login_attempts older than 7 days — runs every Sunday at midnight
SELECT cron.unschedule('cleanup-login-attempts') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-login-attempts'
);
SELECT cron.schedule(
  'cleanup-login-attempts',
  '0 0 * * 0',
  $$DELETE FROM public.login_attempts WHERE attempted_at < NOW() - INTERVAL '7 days'$$
);

-- 2. Clean up old cancelled/no_show appointments older than 1 year — runs 1st of each month
SELECT cron.unschedule('cleanup-old-appointments') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-appointments'
);
SELECT cron.schedule(
  'cleanup-old-appointments',
  '0 2 1 * *',
  $$DELETE FROM public.appointments WHERE status IN ('cancelled', 'no_show') AND created_at < NOW() - INTERVAL '1 year'$$
);

-- 3. Clean up processed pending_emails older than 30 days — runs weekly on Monday
SELECT cron.unschedule('cleanup-pending-emails') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-pending-emails'
);
SELECT cron.schedule(
  'cleanup-pending-emails',
  '0 3 * * 1',
  $$DELETE FROM public.pending_emails WHERE status = 'sent' AND created_at < NOW() - INTERVAL '30 days'$$
);

-- Verify
SELECT jobname, schedule, command FROM cron.job ORDER BY jobname;
