-- FIX: SEPARACIÓN DE MIGRACIÓN PARA ASEGURAR ESTRUCTURA
-- Ejecutar este bloque primero para preparar la tabla

-- 1. Añadir columna domain si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gamification_levels' AND column_name='domain') THEN
        ALTER TABLE gamification_levels ADD COLUMN domain TEXT DEFAULT 'global';
    END IF;
END $$;

-- 2. Limpiar restricciones antiguas para poder cambiar la PK
ALTER TABLE IF EXISTS user_gamification_stats DROP CONSTRAINT IF EXISTS user_gamification_stats_current_level_fkey;
ALTER TABLE IF EXISTS gamification_levels DROP CONSTRAINT IF EXISTS gamification_levels_pkey;

-- 3. Asegurar que todos los registros actuales tengan un dominio por defecto antes de poner la PK
UPDATE gamification_levels SET domain = 'global' WHERE domain IS NULL;
ALTER TABLE gamification_levels ALTER COLUMN domain SET NOT NULL;

-- 4. Establecer la nueva Clave Primaria Compuesta
ALTER TABLE gamification_levels ADD PRIMARY KEY (domain, level);

-- 5. Ahora sí, insertar los niveles (este bloque no fallará por falta de columna)
INSERT INTO gamification_levels (domain, level, min_xp, title, rank_group) VALUES
('global', 1, 0, 'Aspirante', 'Senda del Conquistador'),
('global', 2, 1000, 'Iniciado', 'Senda del Conquistador'),
('global', 5, 5000, 'Explorador', 'Senda del Conquistador'),
('global', 10, 15000, 'Guerrero', 'Senda del Conquistador'),
('global', 25, 50000, 'Comandante', 'Senda del Conquistador'),
('global', 50, 150000, 'Soberano', 'Senda del Conquistador'),
('global', 100, 500000, 'Leyenda', 'Senda del Conquistador'),
('discipline', 1, 0, 'Aprendiz de Foco', 'Maestría de Ejecución'),
('discipline', 5, 2000, 'Forjador', 'Maestría de Ejecución'),
('discipline', 10, 5000, 'Centurión', 'Maestría de Ejecución'),
('discipline', 25, 15000, 'Estratega', 'Maestría de Ejecución'),
('discipline', 50, 50000, 'Ejecutor Maestro', 'Maestría de Ejecución')
ON CONFLICT (domain, level) DO UPDATE SET 
    title = EXCLUDED.title,
    min_xp = EXCLUDED.min_xp;

-- 6. Crear la tabla de estadísticas si no existe
CREATE TABLE IF NOT EXISTS user_domain_stats (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    last_activity_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, domain)
);

-- 7. Vincular
ALTER TABLE user_domain_stats DROP CONSTRAINT IF EXISTS fk_domain_level;
ALTER TABLE user_domain_stats 
ADD CONSTRAINT fk_domain_level FOREIGN KEY (domain, current_level) 
REFERENCES gamification_levels(domain, level);
