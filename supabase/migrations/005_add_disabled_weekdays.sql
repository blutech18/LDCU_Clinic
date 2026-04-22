-- Migration: Add per-day weekday toggle support to schedule_config (#4)
-- Run via Supabase Dashboard SQL Editor or `npx supabase db push`

-- 1. Add new column
ALTER TABLE schedule_config
ADD COLUMN IF NOT EXISTS disabled_weekdays integer[] DEFAULT '{}';

-- 2. Migrate legacy weekend-only toggles into the new array
UPDATE schedule_config
SET disabled_weekdays = ARRAY_REMOVE(ARRAY[
    CASE WHEN include_sunday = false THEN 0 END,
    CASE WHEN include_saturday = false THEN 6 END
], NULL)
WHERE disabled_weekdays = '{}' OR disabled_weekdays IS NULL;

-- 3. (Optional) Drop legacy columns after full code deployment
-- ALTER TABLE schedule_config DROP COLUMN include_saturday;
-- ALTER TABLE schedule_config DROP COLUMN include_sunday;
