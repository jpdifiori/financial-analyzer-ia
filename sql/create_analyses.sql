-- Create analyses table if it doesn't exist
create table if not exists analyses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  summary jsonb,
  installments jsonb,
  categories jsonb,
  ghost_expenses jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table analyses enable row level security;

-- Policy for viewing own analyses
create policy "Users can view their own analyses"
  on analyses for select
  using ( auth.uid() = user_id );

-- Policy for inserting own analyses
create policy "Users can insert their own analyses"
  on analyses for insert
  with check ( auth.uid() = user_id );

-- Policy for deleting own analyses
create policy "Users can delete their own analyses"
  on analyses for delete
  using ( auth.uid() = user_id );
