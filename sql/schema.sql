-- Existing Tables (Already Created)
-- incomes
-- analyses
-- credit_cards
-- fixed_expenses
-- variable_expenses

-- [NEW] Create a table for Expense Categories (e.g., 'Alimentación', 'Transporte', 'Entretenimiento')
create table expense_categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  icon text, -- Optional emoji or icon name
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- [NEW] Create a table for Analyses Linking (Parsing Results)
-- This table stores individual transactions extracted from the PDF, linked to a specific Analysis/Month
create table expense_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  analysis_id uuid references analyses(id) on delete cascade not null, -- Link to the parent analysis
  description text not null,
  amount numeric not null,
  date date, -- Date of the transaction
  category_id uuid references expense_categories(id), -- Auto-categorized or manually set
  is_fixed boolean default false, -- If AI detects it as likely fixed
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Categories
alter table expense_categories enable row level security;

create policy "Users can view their own categories"
  on expense_categories for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own categories"
  on expense_categories for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete their own categories"
  on expense_categories for delete
  using ( auth.uid() = user_id );

-- RLS for Expense Items
alter table expense_items enable row level security;

create policy "Users can view their own expense items"
  on expense_items for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own expense items"
  on expense_items for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete their own expense items"
  on expense_items for delete
  using ( auth.uid() = user_id );

-- Initial Seed Data (Optional helper query for user to run once)
-- insert into expense_categories (user_id, name) values 
-- (auth.uid(), 'Supermercado'), (auth.uid(), 'Servicios'), (auth.uid(), 'Transporte');

-- [NEW] Recurring Incomes Update
-- Add is_recurring, end_date to incomes table.
-- We assume existing incomes are recurring by default (e.g. Salaries) or one-off? 
-- Let's make then recurring default true to be safe for Salaries.
alter table incomes 
add column is_recurring boolean default true,
add column end_date date,
add column receive_date date default now();

-- Update RLS if needed (usually not for new columns if policy is on row level)

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

-- [FIX] Ensure analyses table has card_id column for linking
alter table analyses add column if not exists card_id uuid references credit_cards(id);

-- [FIX] Ensure variable_expenses table exists and has correct structure
create table if not exists variable_expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  description text not null,
  amount numeric not null,
  date date not null,
  category text, -- Can be null or 'General'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table variable_expenses enable row level security;

-- RLS Policies
create policy "Users can view their own variable expenses"
  on variable_expenses for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own variable expenses"
  on variable_expenses for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own variable expenses"
  on variable_expenses for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own variable expenses"
  on variable_expenses for delete
  using ( auth.uid() = user_id );
