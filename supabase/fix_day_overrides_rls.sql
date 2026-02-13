-- Allow public read access (for login page calendar)
CREATE POLICY "Public can read day_overrides"
  ON day_overrides FOR SELECT
  TO public
  USING (true);

-- Ensure authenticated users can still manage
-- (This might be redundant if the existing policy covers it, but good to be safe or explicit)
-- The existing "Authenticated users can manage day_overrides" policy covers ALL operations for authenticated roles.
