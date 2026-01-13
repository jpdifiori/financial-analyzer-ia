-- Add start_date to incomes for versioning consistency
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '1 month');
-- We use a slightly past date for existing ones so they are active in the current view.
COMMIT;
