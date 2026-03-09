-- ============================================
-- LDCU Clinic - Add AM/PM Booking Support
-- ============================================

-- 1. Add time_of_day column to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS time_of_day TEXT CHECK (time_of_day IN ('AM', 'PM'));

-- 2. Add AM/PM slot customization to day_overrides table
ALTER TABLE day_overrides
ADD COLUMN IF NOT EXISTS max_am_bookings INTEGER,
ADD COLUMN IF NOT EXISTS max_pm_bookings INTEGER;

-- 3. Add AM/PM slot customization to booking_settings table
ALTER TABLE booking_settings
ADD COLUMN IF NOT EXISTS max_am_bookings INTEGER,
ADD COLUMN IF NOT EXISTS max_pm_bookings INTEGER;

-- 4. Create index for time_of_day filtering
CREATE INDEX IF NOT EXISTS idx_appointments_time_of_day ON appointments(time_of_day);

-- Verify changes
SELECT 'AM/PM booking support added successfully!' as status;

-- ============================================
-- Notes:
-- - time_of_day can be 'AM' or 'PM'
-- - max_am_bookings and max_pm_bookings allow separate slot limits
-- - If these are NULL, the system uses max_bookings_per_day for both
-- ============================================
