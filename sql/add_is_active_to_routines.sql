-- Add is_active column to routines
ALTER TABLE routines ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing routines to be active by default if they were 'active' in status
UPDATE routines SET is_active = true WHERE status = 'active';
UPDATE routines SET is_active = false WHERE status IN ('completed', 'archived');
