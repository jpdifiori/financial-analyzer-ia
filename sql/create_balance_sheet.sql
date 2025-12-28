-- 1. Assets Table
create table assets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  type text not null, -- e.g., 'Cash', 'Bank Account', 'Investment', 'Real Estate', 'Vehicle'
  description text not null,
  amount numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Liabilities Table
create table liabilities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  type text not null, -- e.g., 'Credit Card', 'Loan', 'Mortgage', 'Other'
  description text not null,
  total_amount numeric not null, -- For loans, the total remaining
  monthly_payment numeric default 0, -- Optional monthly installment
  remaining_installments integer, -- Optional for fixed-term loans
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table assets enable row level security;
alter table liabilities enable row level security;

-- Policies
create policy "Users can manage their own assets"
  on assets for all
  using ( auth.uid() = user_id );

create policy "Users can manage their own liabilities"
  on liabilities for all
  using ( auth.uid() = user_id );

-- View or helper to consolidate future card installments as liabilities
-- This is conceptual, handled in app logic usually but could be a view
