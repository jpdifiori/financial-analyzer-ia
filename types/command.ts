export type CommandPriority = 'low' | 'medium' | 'high' | 'critical';
export type CommandTaskStatus = 'inbox' | 'todo' | 'in_progress' | 'done';
export type CommandMissionStatus = 'active' | 'completed' | 'archived';

export interface CommandMission {
    id: string;
    user_id: string;
    name: string;
    objective?: string | null;
    status: CommandMissionStatus;
    priority: CommandPriority;
    due_date?: string | null;
    created_at: string;
}

export interface CommandTask {
    id: string;
    user_id: string;
    mission_id?: string | null;
    title: string;
    description?: string | null;
    status: CommandTaskStatus;
    priority: CommandPriority;
    due_date?: string | null;
    estimated_time?: number | null; // Minutes
    is_delegated: boolean;
    delegate_to?: string | null;
    created_at: string;

    // Virtual/Joined fields if needed
    mission?: CommandMission;
}
