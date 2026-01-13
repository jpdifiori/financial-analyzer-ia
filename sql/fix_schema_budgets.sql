
-- 1. Create budgets table if it doesn't exist
create table if not exists budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  category text not null,
  amount numeric not null,
  period text not null, -- Format: YYYY-MM
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add unique constraint if it doesn't exist (needed for UPSERT)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'budgets_user_id_category_period_key'
    ) THEN
        ALTER TABLE budgets ADD CONSTRAINT budgets_user_id_category_period_key UNIQUE (user_id, category, period);
    END IF;
END $$;

-- 3. Enable RLS
alter table budgets enable row level security;

-- 4. Create RLS Policies (Safely drop first to avoid conflicts)
drop policy if exists "Users can view their own budgets" on budgets;
drop policy if exists "Users can insert their own budgets" on budgets;
drop policy if exists "Users can update their own budgets" on budgets;
drop policy if exists "Users can delete their own budgets" on budgets;

create policy "Users can view their own budgets"
  on budgets for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own budgets"
  on budgets for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own budgets"
  on budgets for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own budgets"
  on budgets for delete
  using ( auth.uid() = user_id );
