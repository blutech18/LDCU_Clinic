-- ============================================
-- LDCU Clinic - Required Supabase Tables Setup
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Email Templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campus_id, template_type)
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_templates_select" ON email_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "email_templates_insert" ON email_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "email_templates_update" ON email_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "email_templates_delete" ON email_templates FOR DELETE TO authenticated USING (true);

-- 2. Pending Emails queue (fallback for email sending)
CREATE TABLE IF NOT EXISTS pending_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pending_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pending_emails_insert" ON pending_emails FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pending_emails_select" ON pending_emails FOR SELECT TO authenticated USING (true);

-- 3. Schedule Config table (Saturday/Sunday toggle + holidays)
CREATE TABLE IF NOT EXISTS schedule_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  include_saturday BOOLEAN DEFAULT false,
  include_sunday BOOLEAN DEFAULT false,
  holiday_dates TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campus_id)
);

ALTER TABLE schedule_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schedule_config_select" ON schedule_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "schedule_config_insert" ON schedule_config FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "schedule_config_update" ON schedule_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "schedule_config_delete" ON schedule_config FOR DELETE TO authenticated USING (true);

-- 4. Booking Settings table (if not already created)
CREATE TABLE IF NOT EXISTS booking_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  max_bookings_per_day INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campus_id)
);

ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_settings_select" ON booking_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "booking_settings_insert" ON booking_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "booking_settings_update" ON booking_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 5. Departments table (if not already created)
CREATE TABLE IF NOT EXISTS departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments_select" ON departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_insert" ON departments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "departments_public_select" ON departments FOR SELECT TO anon USING (true);

-- ============================================
-- Seed LDCU Departments
-- ============================================
DO $$
DECLARE
  campus_uuid UUID;
BEGIN
  SELECT id INTO campus_uuid FROM campuses LIMIT 1;

  IF campus_uuid IS NULL THEN
    RAISE NOTICE 'No campus found. Skipping department seeding.';
    RETURN;
  END IF;

  -- Clear existing departments for this campus
  DELETE FROM departments WHERE campus_id = campus_uuid;

  -- Higher Education - Colleges
  INSERT INTO departments (name, campus_id) VALUES
    ('College of Arts and Science', campus_uuid),
    ('School of Business, Management and Accountancy', campus_uuid),
    ('College of Criminal Justice', campus_uuid),
    ('College of Engineering', campus_uuid),
    ('College of Information Technology', campus_uuid),
    ('College of Medical Laboratory Science', campus_uuid),
    ('Conservatory of Music, Theater and Dance', campus_uuid),
    ('College of Nursing', campus_uuid),
    ('College of Dentistry', campus_uuid),
    ('College of Pharmacy', campus_uuid),
    ('College of Rehabilitation Sciences', campus_uuid),
    ('College of Radiologic Technology', campus_uuid),
    ('School of Teacher Education', campus_uuid),
    -- Basic Education
    ('Junior High School', campus_uuid),
    ('Senior High School', campus_uuid),
    -- Post Graduate
    ('Graduate Studies', campus_uuid);

  RAISE NOTICE 'Seeded 16 LDCU departments for campus %', campus_uuid;
END $$;

-- Verify departments
SELECT id, name FROM departments ORDER BY name;
