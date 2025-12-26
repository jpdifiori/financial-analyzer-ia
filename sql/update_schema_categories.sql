-- Add 'category' and 'type' to fixed_expenses
alter table fixed_expenses 
add column if not exists category text,
add column if not exists type text;

-- Add 'category' and 'type' to variable_expenses
alter table variable_expenses 
add column if not exists category text,
add column if not exists type text;

-- Optional: Create an index for performance if needed later
-- create index if not exists idx_fixed_expenses_category on fixed_expenses(category);
-- create index if not exists idx_variable_expenses_category on variable_expenses(category);
