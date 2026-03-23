-- ============================================================
-- LDCU Clinic — Booking Rate Limit
-- Prevents duplicate active bookings (1 per patient per day
-- per campus). Safe to re-run.
-- Run in Supabase SQL Editor AFTER fix_rls_policies.sql
-- ============================================================

-- Drop if it already exists (safe re-run)
DROP INDEX IF EXISTS idx_one_booking_per_day;

-- 1 active booking per patient email per campus per day
-- Only scheduled appointments count (completed, cancelled, no_show are excluded)
CREATE UNIQUE INDEX idx_one_booking_per_day
  ON appointments(patient_email, campus_id, appointment_date)
  WHERE status = 'scheduled';

SELECT 'Booking rate limit index created successfully!' AS status;
