
-- [FIX] Create missing credit_cards table
create table if not exists credit_cards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  bank_name text not null, -- e.g. 'Santander', 'Galicia'
  issuer text not null, -- e.g. 'Visa', 'Mastercard'
  last_4 text default 'XXXX', 
  color_theme text default 'slate', -- For UI styling
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table credit_cards enable row level security;

-- RLS Policies
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

-- Add Constraint to avoid exact duplicates (Optional but good)
-- alter table credit_cards add constraint unique_card_per_user unique (user_id, bank_name, issuer, last_4);
