-- Tablas para el Módulo de Forjador de Rutinas

-- 1. Tabla Principal de Rutinas
create table if not exists routines (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    start_time text not null, -- Format HH:mm
    ideal_duration_days integer not null,
    intention text,
    emotional_states text[], -- Array de estados deseados
    commitment_statement text,
    acceptance_of_resistance boolean default false,
    status text default 'active' check (status in ('active', 'completed', 'archived')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Bloques de la Rutina
create table if not exists routine_blocks (
    id uuid default gen_random_uuid() primary key,
    routine_id uuid references routines(id) on delete cascade not null,
    type text not null, -- Meditación, Journal, Lectura, Movimiento, etc.
    duration_minutes integer not null,
    objective text,
    "order" integer not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Contexto y Reglas
create table if not exists routine_context (
    id uuid default gen_random_uuid() primary key,
    routine_id uuid references routines(id) on delete cascade not null,
    location text,
    trigger text,
    non_negotiable_rules text[], 
    plan_b text, -- Versión de emergencia
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Logs de Progreso
create table if not exists routine_logs (
    id uuid default gen_random_uuid() primary key,
    routine_id uuid references routines(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    completed_at date default current_date not null,
    success_percentage integer default 100,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(routine_id, completed_at)
);

-- Habilitar RLS
alter table routines enable row level security;
alter table routine_blocks enable row level security;
alter table routine_context enable row level security;
alter table routine_logs enable row level security;

-- Políticas de Seguridad
create policy "Users can manage their own routines" on routines for all using (auth.uid() = user_id);

create policy "Users can manage blocks of their routines" on routine_blocks for all 
    using (exists (select 1 from routines where id = routine_id and user_id = auth.uid()));

create policy "Users can manage context of their routines" on routine_context for all 
    using (exists (select 1 from routines where id = routine_id and user_id = auth.uid()));

create policy "Users can manage logs of their routines" on routine_logs for all 
    using (auth.uid() = user_id);
