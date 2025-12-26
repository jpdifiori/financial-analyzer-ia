-- Goals Table (Identity, Annual, Quarterly)
create type goal_type as enum ('identity', 'annual', 'quarterly', 'monthly');

create table if not exists goals (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    description text,
    type goal_type not null default 'monthly',
    status text default 'active' check (status in ('active', 'completed', 'archived')),
    progress integer default 0 check (progress >= 0 and progress <= 100),
    deadline date,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tasks Table (Actionable items linked to goals or standalone)
create table if not exists tasks (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    goal_id uuid references goals(id) on delete set null, -- Optional link to a bigger goal
    title text not null,
    is_done boolean default false,
    priority text default 'medium' check (priority in ('low', 'medium', 'high')),
    due_date timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Coach Memory Table (Long-term persistence for the AI)
create table if not exists coach_memory (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    key_fact text not null, -- e.g., "User wants to run a marathon", "User struggles with consistency"
    category text default 'general', -- 'identity', 'preference', 'history'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table goals enable row level security;
alter table tasks enable row level security;
alter table coach_memory enable row level security;

-- Goals Policies
create policy "Users can view their own goals" on goals for select using (auth.uid() = user_id);
create policy "Users can insert their own goals" on goals for insert with check (auth.uid() = user_id);
create policy "Users can update their own goals" on goals for update using (auth.uid() = user_id);
create policy "Users can delete their own goals" on goals for delete using (auth.uid() = user_id);

-- Tasks Policies
create policy "Users can view their own tasks" on tasks for select using (auth.uid() = user_id);
create policy "Users can insert their own tasks" on tasks for insert with check (auth.uid() = user_id);
create policy "Users can update their own tasks" on tasks for update using (auth.uid() = user_id);
create policy "Users can delete their own tasks" on tasks for delete using (auth.uid() = user_id);

-- Memory Policies
create policy "Users can view their own memory" on coach_memory for select using (auth.uid() = user_id);
create policy "Users can insert their own memory" on coach_memory for insert with check (auth.uid() = user_id);
create policy "Users can update their own memory" on coach_memory for update using (auth.uid() = user_id);
create policy "Users can delete their own memory" on coach_memory for delete using (auth.uid() = user_id);
