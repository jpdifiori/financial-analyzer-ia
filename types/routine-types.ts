export type EmotionalState = 'En calma' | 'Enfocado' | 'Poderoso' | 'Agradecido' | 'Creativo';

export interface Routine {
    id: string;
    user_id: string;
    name: string;
    start_time: string;
    ideal_duration_days: number;
    intention: string;
    emotional_states: EmotionalState[];
    commitment_statement: string;
    acceptance_of_resistance: boolean;
    image_url?: string;
    status: 'active' | 'completed' | 'archived';
    is_active: boolean;
    is_primary: boolean;
    created_at: string;
}

export interface RoutineBlock {
    id: string;
    routine_id: string;
    type: string;
    duration_minutes: number;
    objective: string;
    order: number;
    created_at: string;
}

export interface RoutineContext {
    id: string;
    routine_id: string;
    location: string;
    trigger: string;
    non_negotiable_rules: string[];
    plan_b: string;
    created_at: string;
}

export interface RoutineLog {
    id: string;
    routine_id: string;
    user_id: string;
    completed_at: string;
    completed_blocks: string[]; // IDs of routine_blocks
    success_percentage: number;
    notes: string;
    created_at: string;
}

export interface RoutineWithDetails extends Routine {
    blocks: RoutineBlock[];
    context: RoutineContext | null;
    logs: RoutineLog[];
}
