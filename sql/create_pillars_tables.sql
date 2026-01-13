-- Tablas para el Módulo de Pilares de Vida

-- 1. Tabla Principal de Pilares
CREATE TABLE IF NOT EXISTS pillars (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- 'body', 'relationships', 'inner_strength', 'mind', 'mission', 'finance', 'lifestyle'
    name TEXT NOT NULL,
    description TEXT,
    why TEXT,
    vision TEXT,
    identity_statement TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, type)
);

-- 2. Creencias (Limitantes vs Empoderadoras)
CREATE TABLE IF NOT EXISTS pillar_beliefs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pillar_id UUID REFERENCES pillars(id) ON DELETE CASCADE NOT NULL,
    limiting_belief TEXT NOT NULL,
    empowering_belief TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Hábitos (Basados en James Clear: Atomic Habits)
CREATE TABLE IF NOT EXISTS pillar_habits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pillar_id UUID REFERENCES pillars(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    cue TEXT,         -- Señal (Señal)
    craving TEXT,     -- Anhelo (Opcional, para reflexión)
    response TEXT,    -- Respuesta (Hábito en sí)
    reward TEXT,      -- Recompensa
    frequency TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'custom'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Hitos (Planificación de Metas)
CREATE TABLE IF NOT EXISTS pillar_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pillar_id UUID REFERENCES pillars(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE pillar_beliefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pillar_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE pillar_milestones ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad
CREATE POLICY "Users can manage their own pillars" ON pillars FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage beliefs of their pillars" ON pillar_beliefs FOR ALL 
    USING (EXISTS (SELECT 1 FROM pillars WHERE id = pillar_id AND user_id = auth.uid()));

CREATE POLICY "Users can manage habits of their pillars" ON pillar_habits FOR ALL 
    USING (EXISTS (SELECT 1 FROM pillars WHERE id = pillar_id AND user_id = auth.uid()));

CREATE POLICY "Users can manage milestones of their pillars" ON pillar_milestones FOR ALL 
    USING (EXISTS (SELECT 1 FROM pillars WHERE id = pillar_id AND user_id = auth.uid()));

-- 5. Función y Trigger para Auto-creación de Pilares
CREATE OR REPLACE FUNCTION public.handle_new_user_pillars()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.pillars (user_id, type, name, description)
    VALUES 
        (NEW.id, 'body', 'Cuerpo y Vitalidad', 'Transforma tu cuerpo en una fuente de energía inagotable para conquistar tus metas.'),
        (NEW.id, 'relationships', 'Vínculos y Comunidad', 'Construye y nutre vínculos profundos que formen una comunidad de apoyo incondicional.'),
        (NEW.id, 'inner_strength', 'Fortaleza Interior', 'Domina tu mundo interior para ser inquebrantable ante los desafíos del mundo exterior.'),
        (NEW.id, 'mind', 'Mente y Maestría', 'Desarrolla tu mente como una herramienta de élite para aprender rápido y crear oportunidades.'),
        (NEW.id, 'mission', 'Misión y Carrera', 'Define y ejecuta tu obra, convirtiendo tu carrera en una misión de alto impacto.'),
        (NEW.id, 'finance', 'Finanzas y Libertad', 'Domina el juego del dinero para que sea una herramienta que te compre libertad y tiempo.'),
        (NEW.id, 'lifestyle', 'Calidad de Vida y Aventura', 'Diseña un estilo de vida que de gloria, belleza y experiencias memorables.');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para nuevos usuarios
CREATE OR REPLACE TRIGGER on_auth_user_created_pillars
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_pillars();
