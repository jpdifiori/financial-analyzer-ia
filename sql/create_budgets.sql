-- budgets table to track monthly limits per category
create table budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  category text not null,
  amount numeric not null,
  period text not null, -- Format: YYYY-MM
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, category, period)
);

-- Enable RLS
alter table budgets enable row level security;

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
