-- Add a text column to store the AI suggested category name
alter table expense_items add column if not exists suggested_category text;
