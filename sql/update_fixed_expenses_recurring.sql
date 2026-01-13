-- Migration to support recurrence and versioning in Fixed Expenses
-- Run this in your Supabase SQL Editor

ALTER TABLE fixed_expenses 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- OPTIONAL: If you want all existing fixed expenses to start from a specific past date 
-- UPDATE fixed_expenses SET start_date = '2024-01-01' WHERE start_date IS NULL;

COMMIT;
