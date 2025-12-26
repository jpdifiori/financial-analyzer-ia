
-- [FIX] Ensure analyses table has card_id column for linking
alter table analyses add column if not exists card_id uuid references credit_cards(id);
