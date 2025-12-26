export type GoalType = 'identity' | 'annual' | 'quarterly' | 'monthly';

export interface Goal {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    type: GoalType;
    status: 'active' | 'completed' | 'archived';
    progress: number;
    deadline?: string;
    created_at: string;
}

export interface Task {
    id: string;
    user_id: string;
    goal_id?: string;
    title: string;
    is_done: boolean;
    priority: 'low' | 'medium' | 'high';
    due_date?: string;
    created_at: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    // Optional: Actions suggested by AI that the UI can render nicely
    suggestedActions?: {
        type: 'create_task' | 'update_goal';
        payload: any;
        label: string;
    }[];
}

export interface CoachContext {
    identityGoals: Goal[];
    longTermGoals: Goal[];
    activeTasks: Task[];
}
