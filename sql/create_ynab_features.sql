-- 1. Savings Goals Table
create table savings_goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  target_amount numeric not null,
  current_amount numeric default 0,
  target_date date,
  category text,
  status text default 'active', -- active, achieved, canceled
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Partnerships (YNAB Together)
-- This table links two users to share their financial data
create table partnerships (
  id uuid default gen_random_uuid() primary key,
  inviter_id uuid references auth.users not null,
  invitee_email text not null,
  invitee_id uuid references auth.users, -- will be filled when they accept
  status text default 'pending', -- pending, active, rejected
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(inviter_id, invitee_email)
);

-- Enable RLS
alter table savings_goals enable row level security;
alter table partnerships enable row level security;

-- Savings Goals Policies (Shared access if partnered)
create policy "Users can view their own and partner's goals"
  on savings_goals for select
  using (
    auth.uid() = user_id OR 
    exists (
      select 1 from partnerships 
      where (inviter_id = auth.uid() and invitee_id = savings_goals.user_id) or
            (invitee_id = auth.uid() and inviter_id = savings_goals.user_id)
    )
  );

create policy "Users can insert their own goals"
  on savings_goals for insert
  with check ( auth.uid() = user_id );

-- Partnership Policies
create policy "Users can view their own partnerships"
  on partnerships for select
  using ( auth.uid() = inviter_id or auth.uid() = invitee_id );

create policy "Users can invite partners"
  on partnerships for insert
  with check ( auth.uid() = inviter_id );
