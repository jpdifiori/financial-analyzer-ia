-- DEFINITIVE REPAIR FOR PRIMARY ROUTINE
-- 1. Ensure the column exists
ALTER TABLE routines ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- 2. Create the unique index to ensure only ONE primary routine per user
-- We use a filtered index for this (idempotent setup)
DROP INDEX IF EXISTS unique_primary_routine_per_user;
CREATE UNIQUE INDEX unique_primary_routine_per_user ON routines(user_id) WHERE is_primary = true;

-- 3. Ensure index for performance
CREATE INDEX IF NOT EXISTS idx_routines_is_primary_lookup ON routines(user_id) WHERE is_primary = true;

-- 4. Verify RLS (should be already there, but just in case)
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;

-- If for some reason the policy is missing, this ensures it exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'routines' AND policyname = 'Users can manage their own routines'
    ) THEN
        CREATE POLICY "Users can manage their own routines" ON routines FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
