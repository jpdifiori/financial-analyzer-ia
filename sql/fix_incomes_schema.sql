-- SQL Fix for Incomes Table
-- Run this in your Supabase SQL Editor

-- 1. Ensure the 'incomes' table exists with foundational columns
create table if not exists incomes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  description text not null,
  amount numeric not null,
  type text check (type in ('Salario', 'Renta', 'Inversiones', 'Otro')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add/Verify Recurring feature columns
alter table incomes add column if not exists is_recurring boolean default true;
alter table incomes add column if not exists end_date date;
alter table incomes add column if not exists receive_date date default now();

-- 3. Reset RLS and Policies for robustness
alter table incomes enable row level security;

drop policy if exists "Users can view their own incomes" on incomes;
drop policy if exists "Users can insert their own incomes" on incomes;
drop policy if exists "Users can delete their own incomes" on incomes;

create policy "Users can view their own incomes"
  on incomes for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own incomes"
  on incomes for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete their own incomes"
  on incomes for delete
  using ( auth.uid() = user_id );

commit;
