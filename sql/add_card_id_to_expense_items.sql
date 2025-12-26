
-- Add card_id column to expense_items to link directly to credit_cards
alter table expense_items 
add column if not exists card_id uuid references credit_cards(id);

-- Optional: Add index for performance if querying by card often
create index if not exists idx_expense_items_card_id on expense_items(card_id);
