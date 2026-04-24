-- Enforce profile name length limits to prevent UI/data overflow issues (#7)
-- Using NOT VALID so existing over-limit records do not block migration;
-- constraints still apply to all new/updated rows.

ALTER TABLE profiles
  ADD CONSTRAINT profiles_first_name_max_len_100
  CHECK (char_length(first_name) <= 100) NOT VALID;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_last_name_max_len_100
  CHECK (char_length(last_name) <= 100) NOT VALID;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_middle_name_max_len_100
  CHECK (middle_name IS NULL OR char_length(middle_name) <= 100) NOT VALID;

