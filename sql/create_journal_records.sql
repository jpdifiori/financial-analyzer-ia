-- ==========================================
-- SCRIPT DE EMERGENCIA: BITÁCORA CONSCIENTE
-- ==========================================

-- 1. LIMPIEZA TOTAL
DROP TABLE IF EXISTS public.journal_records CASCADE;

-- 2. CREACIÓN DE TABLA (Ultra-resistente)
CREATE TABLE public.journal_records (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    entry_date date DEFAULT CURRENT_DATE NOT NULL,
    
    -- Contenido
    user_content text NOT NULL,
    chat_history jsonb DEFAULT '[]'::jsonb,
    
    -- Inteligencia Artificial
    ai_feedback jsonb DEFAULT '{
        "recommendations": [],
        "work_points": [],
        "focus_areas": [],
        "alerts": [],
        "assistance": ""
    }'::jsonb,
    
    -- Metadatos de Prompts
    prompt_id text,
    category_tag text,
    
    -- Gestión de Notas
    type text NOT NULL CHECK (type IN ('text', 'voice')),
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
    summary text,
    mood text,
    tags text[] DEFAULT ARRAY[]::text[],
    audio_url text,
    
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. SEGURIDAD (RLS)
ALTER TABLE public.journal_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own journal records" ON public.journal_records;
CREATE POLICY "Users can manage their own journal records" 
ON public.journal_records FOR ALL 
USING (auth.uid() = user_id);

-- 4. RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_journal_records_user_date ON public.journal_records(user_id, entry_date);

-- 5. PERMISOS DE ESQUEMA (Soluciona el error de Schema Cache)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.journal_records TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 6. RECARGA DE API
NOTIFY pgrst, 'reload schema';
