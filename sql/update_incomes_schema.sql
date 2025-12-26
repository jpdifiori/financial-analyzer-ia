
-- [NEW] Recurring Incomes Update
-- Add is_recurring, end_date to incomes table.
-- We assume existing incomes are recurring by default (e.g. Salaries) or one-off? 
-- Let's make then recurring default true to be safe for Salaries.
alter table incomes 
add column is_recurring boolean default true,
add column end_date date,
add column receive_date date default now();

-- Update RLS if needed (usually not for new columns if policy is on row level)
