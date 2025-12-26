
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
