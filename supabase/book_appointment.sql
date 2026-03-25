-- ============================================================
-- LDCU Clinic — Atomic Booking Function (Advisory Lock)
-- Prevents double-booking / overbooking via PostgreSQL
-- advisory locks. Only one booking per campus+date processes
-- at a time, eliminating race conditions.
--
-- Safe to re-run. Run in Supabase SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION book_appointment(
  p_patient_id     UUID DEFAULT NULL,
  p_campus_id      UUID DEFAULT NULL,
  p_appointment_type TEXT DEFAULT 'consultation',
  p_appointment_date DATE DEFAULT CURRENT_DATE,
  p_start_time     TEXT DEFAULT '08:00',
  p_end_time       TEXT DEFAULT '12:00',
  p_status         TEXT DEFAULT 'scheduled',
  p_time_of_day    TEXT DEFAULT 'AM',
  p_notes          TEXT DEFAULT NULL,
  p_patient_name   TEXT DEFAULT NULL,
  p_patient_email  TEXT DEFAULT NULL,
  p_patient_phone  TEXT DEFAULT NULL,
  p_booker_role    TEXT DEFAULT 'student'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_key       BIGINT;
  v_max            INT;
  v_current        INT;
  v_max_am         INT;
  v_max_pm         INT;
  v_current_am_pm  INT;
  v_new_id         UUID;
  v_result         JSON;
BEGIN
  -- ── 1. Compute a deterministic lock key from campus + date ──
  v_lock_key := abs(hashtext(p_campus_id::text || p_appointment_date::text));

  -- ── 2. Acquire advisory lock (transaction-scoped) ──
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- ── 3. Reject if patient already has a scheduled appointment ──
  IF p_patient_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM appointments
      WHERE patient_id = p_patient_id
        AND status = 'scheduled'
    ) THEN
      RAISE EXCEPTION 'ALREADY_BOOKED: You already have a scheduled appointment. Please complete or cancel it first.';
    END IF;
  END IF;

  -- ── 4. Get max bookings for this campus+date ──
  SELECT
    CASE
      WHEN dov.is_closed THEN 0
      WHEN dov.max_bookings IS NOT NULL THEN dov.max_bookings
      ELSE COALESCE(bs.max_bookings_per_day, 50)
    END,
    dov.max_am_bookings,
    dov.max_pm_bookings
  INTO v_max, v_max_am, v_max_pm
  FROM (SELECT 1) AS dummy
  LEFT JOIN day_overrides dov
    ON dov.campus_id = p_campus_id AND dov.override_date = p_appointment_date
  LEFT JOIN booking_settings bs
    ON bs.campus_id = p_campus_id;

  v_max := COALESCE(v_max, 50);

  -- ── 5. Count current active bookings (total) ──
  SELECT count(*)::INT INTO v_current
  FROM appointments
  WHERE campus_id = p_campus_id
    AND appointment_date = p_appointment_date
    AND status NOT IN ('cancelled');

  -- ── 6. Reject if at total capacity ──
  IF v_current >= v_max THEN
    RAISE EXCEPTION 'FULLY_BOOKED: This date has reached the maximum of % bookings.', v_max;
  END IF;

  -- ── 7. Check AM/PM sub-capacity if overrides are set ──
  IF p_time_of_day = 'AM' AND v_max_am IS NOT NULL THEN
    SELECT count(*)::INT INTO v_current_am_pm
    FROM appointments
    WHERE campus_id = p_campus_id
      AND appointment_date = p_appointment_date
      AND time_of_day = 'AM'
      AND status NOT IN ('cancelled');
    IF v_current_am_pm >= v_max_am THEN
      RAISE EXCEPTION 'FULLY_BOOKED_AM: The AM session has reached the maximum of % bookings.', v_max_am;
    END IF;
  END IF;

  IF p_time_of_day = 'PM' AND v_max_pm IS NOT NULL THEN
    SELECT count(*)::INT INTO v_current_am_pm
    FROM appointments
    WHERE campus_id = p_campus_id
      AND appointment_date = p_appointment_date
      AND time_of_day = 'PM'
      AND status NOT IN ('cancelled');
    IF v_current_am_pm >= v_max_pm THEN
      RAISE EXCEPTION 'FULLY_BOOKED_PM: The PM session has reached the maximum of % bookings.', v_max_pm;
    END IF;
  END IF;

  -- ── 8. Insert the appointment ──
  INSERT INTO appointments (
    patient_id, campus_id, appointment_type, appointment_date,
    start_time, end_time, status, time_of_day,
    notes, patient_name, patient_email, patient_phone, booker_role
  ) VALUES (
    p_patient_id, p_campus_id, p_appointment_type::appointment_type, p_appointment_date,
    p_start_time::time, p_end_time::time, p_status::appointment_status, p_time_of_day,
    p_notes, p_patient_name, p_patient_email, p_patient_phone, p_booker_role
  )
  RETURNING id INTO v_new_id;

  -- ── 9. Return the full new row as JSON ──
  SELECT row_to_json(a.*) INTO v_result
  FROM appointments a
  WHERE a.id = v_new_id;

  RETURN v_result;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION book_appointment TO authenticated;

-- Verify
SELECT 'book_appointment() function created successfully!' AS status;
