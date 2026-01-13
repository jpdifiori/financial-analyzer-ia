-- Tablas para el Módulo de Desafíos (Misogi)

-- 1. Tabla Principal de Desafíos
create table if not exists challenges (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    cover_image text,
    motivation text,
    transformation text,
    status text default 'active' check (status in ('active', 'completed', 'abandoned')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Recursos (Habilidades y Equipo)
create table if not exists challenge_resources (
    id uuid default gen_random_uuid() primary key,
    challenge_id uuid references challenges(id) on delete cascade not null,
    title text not null,
    type text not null check (type in ('skill', 'equipment')),
    acquired boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Hoja de Ruta (Hitos, Hábitos y Tareas)
create table if not exists challenge_roadmap (
    id uuid default gen_random_uuid() primary key,
    challenge_id uuid references challenges(id) on delete cascade not null,
    title text not null,
    type text not null check (type in ('milestone', 'habit', 'task')),
    completed boolean default false,
    completed_days text[], -- Array de fechas ISO para hábitos
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Bitácora (Notas de Texto y Voz)
create table if not exists challenge_logbook (
    id uuid default gen_random_uuid() primary key,
    challenge_id uuid references challenges(id) on delete cascade not null,
    content text,
    type text not null check (type in ('text', 'voice')),
    audio_url text, -- Store base64 or storage URL
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table challenges enable row level security;
alter table challenge_resources enable row level security;
alter table challenge_roadmap enable row level security;
alter table challenge_logbook enable row level security;

-- Políticas de Seguridad
create policy "Users can manage their own challenges" on challenges for all using (auth.uid() = user_id);
create policy "Users can manage resources of their challenges" on challenge_resources for all 
    using (exists (select 1 from challenges where id = challenge_id and user_id = auth.uid()));
create policy "Users can manage roadmap of their challenges" on challenge_roadmap for all 
    using (exists (select 1 from challenges where id = challenge_id and user_id = auth.uid()));
create policy "Users can manage logbook of their challenges" on challenge_logbook for all 
    using (exists (select 1 from challenges where id = challenge_id and user_id = auth.uid()));
