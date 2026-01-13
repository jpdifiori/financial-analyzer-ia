-- TABLA CONSOLIDADA: Módulo de Bitácora (Journaling Consciente)
-- Eliminar si existe para recrear con el esquema experto (CUIDADO: Borra datos previos del módulo)
-- drop table if exists journal_entries;

create table if not exists journal_entries (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    entry_date date default current_date not null,
    
    -- Contenido
    user_content text not null,       -- Texto final o transcripción consolidada
    chat_history jsonb default '[]'::jsonb, -- Historial completo [{role, content}]
    
    -- Inteligencia Artificial
    ai_feedback jsonb default '{
        "recommendations": [],
        "work_points": [],
        "focus_areas": [],
        "alerts": [],
        "assistance": ""
    }'::jsonb,
    
    -- Metadatos y Gestión
    prompt_id text,                   -- ID de la pregunta disparadora
    category_tag text,                -- Slug de la categoría (wealth, mindset, etc)
    type text not null check (type in ('text', 'voice')),
    status text default 'draft' check (status in ('draft', 'finalized')),
    summary text,                      -- Resumen corto de la IA para el calendario
    mood text,                         -- Estado de ánimo detectado
    tags text[] default array[]::text[],
    audio_url text,                   -- URL de storage si es voz
    
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
    -- Eliminamos la restricción unique(user_id, entry_date) para permitir múltiples entradas
);

-- Asegurar que las columnas existan si la tabla ya había sido creada previamente
alter table journal_entries add column if not exists prompt_id text;
alter table journal_entries add column if not exists category_tag text;

-- Habilitar RLS
alter table journal_entries enable row level security;

-- Políticas (Eliminar si existe para evitar error 42710)
drop policy if exists "Users can manage their own journal entries" on journal_entries;

create policy "Users can manage their own journal entries" on journal_entries for all
    using (auth.uid() = user_id);

-- Índices para búsqueda rápida por fecha (Ya no es único)
create index if not exists idx_journal_user_date on journal_entries(user_id, entry_date);

-- Forzar recarga del esquema en PostgREST (Supabase API)
NOTIFY pgrst, 'reload schema';
