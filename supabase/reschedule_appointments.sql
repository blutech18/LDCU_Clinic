-- ============================================================
-- LDCU Clinic — Atomic Reschedule Function (Advisory Lock)
-- Prevents overbooking when two supervisors reschedule
-- simultaneously. Uses advisory locks per target date.
--
-- Safe to re-run. Run in Supabase SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION reschedule_appointment(
  p_appointment_id  UUID,
  p_target_date     DATE,
  p_campus_id       UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_key  BIGINT;
  v_max       INT;
  v_current   INT;
BEGIN
  -- 1. Compute lock key for the TARGET date + campus
  v_lock_key := abs(hashtext(p_campus_id::text || p_target_date::text));

  -- 2. Acquire advisory lock (transaction-scoped)
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 3. Get max bookings for this campus+date
  SELECT
    CASE
      WHEN dov.is_closed THEN 0
      WHEN dov.max_bookings IS NOT NULL THEN dov.max_bookings
      ELSE COALESCE(bs.max_bookings_per_day, 50)
    END
  INTO v_max
  FROM (SELECT 1) AS dummy
  LEFT JOIN day_overrides dov
    ON dov.campus_id = p_campus_id AND dov.override_date = p_target_date
  LEFT JOIN booking_settings bs
    ON bs.campus_id = p_campus_id;

  v_max := COALESCE(v_max, 50);

  -- 4. Count current active bookings on target date
  SELECT count(*)::INT INTO v_current
  FROM appointments
  WHERE campus_id = p_campus_id
    AND appointment_date = p_target_date
    AND status NOT IN ('cancelled');

  -- 5. Reject if at capacity
  IF v_current >= v_max THEN
    RAISE EXCEPTION 'FULLY_BOOKED: Target date % has reached the maximum of % bookings.', p_target_date, v_max;
  END IF;

  -- 6. Update the appointment
  UPDATE appointments
  SET appointment_date = p_target_date,
      status = 'scheduled'
  WHERE id = p_appointment_id;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION reschedule_appointment TO authenticated;

-- Verify
SELECT 'reschedule_appointment() function created successfully!' AS status;
