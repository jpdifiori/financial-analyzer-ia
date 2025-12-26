
-- Add expense_type column to variable_expenses
alter table variable_expenses 
add column if not exists expense_type text default 'Efectivo'; -- Efectivo, Debito, Transferencia, QR, etc.

-- Ensure category is present (it should be, but just in case)
alter table variable_expenses 
add column if not exists category text default 'General';
