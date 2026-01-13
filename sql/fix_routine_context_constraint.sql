-- Add unique constraint to routine_context(routine_id) to allow upsert
-- 1. First, identify and clean up any duplicates if they exist (safety measure)
DELETE FROM routine_context a USING routine_context b
WHERE a.id < b.id AND a.routine_id = b.routine_id;

-- 2. Add the unique constraint
ALTER TABLE routine_context ADD CONSTRAINT routine_context_routine_id_key UNIQUE (routine_id);
