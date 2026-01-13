-- AUTOMATIZACIÓN DE GAMIFICACIÓN (TRIGGERS)

-- 1. Función Maestra: Procesar Log de Rutina
-- Se ejecuta cada vez que se inserta o actualiza un log en routine_logs.
CREATE OR REPLACE FUNCTION process_routine_log_gamification()
RETURNS TRIGGER AS $$
DECLARE
    xp_gained INTEGER;
    current_user_stats user_gamification_stats%ROWTYPE;
    new_level INTEGER;
    is_perfect_day BOOLEAN;
    streak_increment INTEGER := 0;
    last_log_date DATE;
BEGIN
    -- Solo procesar si hay cambios relevantes (ej: success_percentage cambia o es nuevo insert)
    IF (TG_OP = 'UPDATE' AND OLD.success_percentage = NEW.success_percentage) THEN
        RETURN NEW;
    END IF;

    -- 1. Calcular XP Base (Por ejemplo: 1 XP por cada 1% de éxito)
    -- Si es UPDATE, calculamos la diferencia para no dar XP doble.
    IF (TG_OP = 'INSERT') THEN
        xp_gained := NEW.success_percentage;
    ELSE
        xp_gained := NEW.success_percentage - OLD.success_percentage;
    END IF;
    
    -- Si el XP ganado es 0 o negativo (bajada de nota), no hacemos nada complejo, solo ajuste
    IF xp_gained IS NULL OR xp_gained = 0 THEN
        RETURN NEW;
    END IF;

    -- 2. Obtener o Inicializar Stats del Usuario para el dominio 'routines'
    INSERT INTO user_domain_stats (user_id, domain, total_xp, current_level)
    VALUES (NEW.user_id, 'routines', 0, 1)
    ON CONFLICT (user_id, domain) DO NOTHING;

    -- 3. Actualizar Stats del dominio 'routines'
    UPDATE user_domain_stats
    SET 
        total_xp = total_xp + xp_gained,
        updated_at = now()
    WHERE user_id = NEW.user_id AND domain = 'routines'
    RETURNING * INTO current_user_stats;

    -- 4. Actualizar dominio 'global' (Aggregate)
    INSERT INTO user_domain_stats (user_id, domain, total_xp, current_level)
    VALUES (NEW.user_id, 'global', 0, 1)
    ON CONFLICT (user_id, domain) DO NOTHING;

    UPDATE user_domain_stats
    SET 
        total_xp = total_xp + xp_gained,
        updated_at = now()
    WHERE user_id = NEW.user_id AND domain = 'global';

    -- 5. Registrar en Log de XP (Auditoría)
    INSERT INTO user_xp_logs (user_id, amount, source_type, source_id, metadata, created_at)
    VALUES (NEW.user_id, xp_gained, 'routine_log', NEW.id, '{"domain": "routines"}'::jsonb, now());

    -- 6. Verificar Level Up para 'routines'
    SELECT level INTO new_level 
    FROM gamification_levels 
    WHERE domain = 'routines' AND min_xp <= (SELECT total_xp FROM user_domain_stats WHERE user_id = NEW.user_id AND domain = 'routines')
    ORDER BY min_xp DESC 
    LIMIT 1;

    IF new_level > current_user_stats.current_level THEN
        UPDATE user_domain_stats SET current_level = new_level WHERE user_id = NEW.user_id AND domain = 'routines';
    END IF;

    -- 7. Verificar Level Up para 'global'
    SELECT level INTO new_level 
    FROM gamification_levels 
    WHERE domain = 'global' AND min_xp <= (SELECT total_xp FROM user_domain_stats WHERE user_id = NEW.user_id AND domain = 'global')
    ORDER BY min_xp DESC 
    LIMIT 1;

    IF new_level > (SELECT current_level FROM user_domain_stats WHERE user_id = NEW.user_id AND domain = 'global') THEN
        UPDATE user_domain_stats SET current_level = new_level WHERE user_id = NEW.user_id AND domain = 'global';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear el Trigger
DROP TRIGGER IF EXISTS trigger_gamification_routine_log ON routine_logs;

CREATE TRIGGER trigger_gamification_routine_log
AFTER INSERT OR UPDATE ON routine_logs
FOR EACH ROW
EXECUTE FUNCTION process_routine_log_gamification();
