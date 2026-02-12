-- Day overrides table: per-date custom slot limits
CREATE TABLE IF NOT EXISTS day_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  max_bookings INT NOT NULL DEFAULT 50,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campus_id, override_date)
);

-- Enable RLS
ALTER TABLE day_overrides ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read day_overrides"
  ON day_overrides FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert/update/delete
CREATE POLICY "Authenticated users can manage day_overrides"
  ON day_overrides FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
