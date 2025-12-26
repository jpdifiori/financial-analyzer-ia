-- Create incomes table if it doesn't exist
create table if not exists incomes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  description text not null,
  amount numeric not null,
  type text check (type in ('Salario', 'Renta', 'Inversiones', 'Otro')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table incomes enable row level security;

-- Policy for viewing own incomes
create policy "Users can view their own incomes"
  on incomes for select
  using ( auth.uid() = user_id );

-- Policy for inserting own incomes
create policy "Users can insert their own incomes"
  on incomes for insert
  with check ( auth.uid() = user_id );

-- Policy for deleting own incomes
create policy "Users can delete their own incomes"
  on incomes for delete
  using ( auth.uid() = user_id );
