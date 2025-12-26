-- Create credit_cards table
create table if not exists credit_cards (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    bank_name text not null, -- e.g. Santander, Galicia
    issuer text, -- e.g. Visa, Mastercard
    last_4 text, -- e.g. 1234 (optional)
    color_theme text, -- e.g. 'orange', 'blue', 'black' (for UI)
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, bank_name, issuer, last_4) -- Prevent duplicate cards
);

-- RLS for credit_cards
alter table credit_cards enable row level security;

create policy "Users can view their own cards"
  on credit_cards for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own cards"
  on credit_cards for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own cards"
  on credit_cards for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own cards"
  on credit_cards for delete
  using ( auth.uid() = user_id );

-- Link analyses to credit_cards
alter table analyses 
add column if not exists card_id uuid references credit_cards(id) on delete set null;
