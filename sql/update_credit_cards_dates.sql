-- Add closing and payment day to credit cards
alter table credit_cards 
add column if not exists closing_day integer check (closing_day >= 1 and closing_day <= 31),
add column if not exists payment_day integer check (payment_day >= 1 and payment_day <= 31);

-- Force reload schema
notify pgrst, 'reload schema';
