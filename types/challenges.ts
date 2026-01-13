export interface Milestone {
    id: string;
    title: string;
    completed: boolean;
    description?: string;
    targetDate?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'critical';
    notes?: string;
}

export interface Habit {
    id: string;
    title: string;
    frequency: string;
    completedDays: string[]; // ISO dates
}

export interface Task {
    id: string;
    title: string;
    completed: boolean;
}

export interface Resource {
    id: string;
    title: string;
    type: "skill" | "equipment";
    acquired: boolean;
}

export interface Note {
    id: string;
    content: string;
    type: "text" | "voice";
    audioUrl?: string;
    timestamp: string;
}

export interface Challenge {
    id: string;
    name: string;
    cover_image?: string;
    coverImage?: string; // Keep for compatibility
    purpose: {
        motivation: string;
        transformation: string;
    };
    resources: Resource[];
    roadmap: {
        milestones: Milestone[];
        habits: Habit[];
        tasks: Task[];
    };
    logbook: Note[];
    status: "active" | "completed" | "abandoned";
    createdAt?: string;
    created_at?: string;
}
