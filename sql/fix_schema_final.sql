-- 1. Ensure 'analyses' table exists
create table if not exists analyses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  summary jsonb,
  installments jsonb,
  categories jsonb,
  ghost_expenses jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Ensure 'expense_items' table exists
create table if not exists expense_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  analysis_id uuid references analyses(id) on delete cascade not null,
  description text not null,
  amount numeric not null,
  date date,
  category_id uuid references expense_categories(id),
  is_fixed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. CRITICAL: Ensure 'suggested_category' column exists in 'expense_items'
alter table expense_items add column if not exists suggested_category text;

-- 4. Enable RLS and Policies (Safe re-run)
alter table analyses enable row level security;
alter table expense_items enable row level security;

-- Drop existing policies to avoid conflicts before re-creating
drop policy if exists "Users can view their own analyses" on analyses;
drop policy if exists "Users can insert their own analyses" on analyses;
drop policy if exists "Users can delete their own analyses" on analyses;

drop policy if exists "Users can view their own expense items" on expense_items;
drop policy if exists "Users can insert their own expense items" on expense_items;
drop policy if exists "Users can delete their own expense items" on expense_items;

-- Re-create Policies
create policy "Users can view their own analyses" on analyses for select using ( auth.uid() = user_id );
create policy "Users can insert their own analyses" on analyses for insert with check ( auth.uid() = user_id );
create policy "Users can delete their own analyses" on analyses for delete using ( auth.uid() = user_id );

create policy "Users can view their own expense items" on expense_items for select using ( auth.uid() = user_id );
create policy "Users can insert their own expense items" on expense_items for insert with check ( auth.uid() = user_id );
create policy "Users can delete their own expense items" on expense_items for delete using ( auth.uid() = user_id );
