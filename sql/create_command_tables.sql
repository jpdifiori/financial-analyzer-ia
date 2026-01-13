-- Tablas para el Módulo Command (Gestión de Tareas)

-- 1. Misiones (Proyectos/Grandes Objetivos)
create table if not exists command_missions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    objective text,
    status text default 'active' check (status in ('active', 'completed', 'archived')),
    priority text default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
    due_date timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tareas (Items de Inbox, Accionar, etc.)
create table if not exists command_tasks (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    mission_id uuid references command_missions(id) on delete set null, -- Puede pertenecer a una misión o no
    title text not null,
    description text,
    status text default 'inbox' check (status in ('inbox', 'todo', 'in_progress', 'done')),
    priority text default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
    due_date timestamp with time zone,
    is_delegated boolean default false,
    delegate_to text, -- Nombre de la persona a quien se delega
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table command_missions enable row level security;
alter table command_tasks enable row level security;

-- Políticas de Seguridad
create policy "Users can manage their own missions" on command_missions for all 
    using (auth.uid() = user_id);

create policy "Users can manage their own tasks" on command_tasks for all 
    using (auth.uid() = user_id);
