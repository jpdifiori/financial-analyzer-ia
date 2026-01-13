export type PillarType = 'body' | 'relationships' | 'inner_strength' | 'mind' | 'mission' | 'finance' | 'lifestyle';

export interface Pillar {
    id: string;
    user_id: string;
    type: PillarType;
    name: string;
    description: string;
    why?: string;
    vision?: string;
    identity_statement?: string;
    created_at: string;
}

export interface PillarBelief {
    id: string;
    pillar_id: string;
    limiting_belief: string;
    empowering_belief: string;
    created_at: string;
}

export interface PillarHabit {
    id: string;
    pillar_id: string;
    title: string;
    cue?: string;
    craving?: string;
    response?: string;
    reward?: string;
    frequency: string;
    created_at: string;
}

export interface PillarMilestone {
    id: string;
    pillar_id: string;
    title: string;
    description?: string;
    target_date?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    created_at: string;
}

export interface PillarWithDetails extends Pillar {
    beliefs: PillarBelief[];
    habits: PillarHabit[];
    milestones: PillarMilestone[];
}
