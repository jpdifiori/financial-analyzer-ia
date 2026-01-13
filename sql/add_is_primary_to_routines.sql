-- Add is_primary column to routines table
ALTER TABLE routines ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- Create an index to speed up primary routine lookup
CREATE INDEX IF NOT EXISTS idx_routines_is_primary ON routines(user_id) WHERE is_primary = true;

-- Optional: Ensure only one routine can be primary per user at a time
-- We handle this in the application logic usually, but a constraint is safer.
-- Note: This requires a unique index across (user_id) where is_primary is true.
-- However, standard Postgres unique constraints don't support WHERE easily in all versions without a filtered index.
DROP INDEX IF EXISTS unique_primary_routine_per_user;
CREATE UNIQUE INDEX unique_primary_routine_per_user ON routines(user_id) WHERE is_primary = true;
