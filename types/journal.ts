export interface JournalAIFeedback {
    recommendations: string[];
    workPoints: string[];
    focusAreas: string[];
    alerts: string[];
    assistance?: string;
    mood?: string;
}

export interface JournalEntry {
    id: string;
    userId: string;
    entryDate: string; // ISO Date YYYY-MM-DD
    userContent: string;
    chatHistory: { role: 'user' | 'model', content: string; feedback?: JournalAIFeedback }[];
    aiFeedback?: JournalAIFeedback;
    type: 'text' | 'voice';
    status: 'draft' | 'finalized';
    promptId?: string;       // <--- Nuevo
    categoryTag?: string;    // <--- Nuevo
    summary?: string;
    audioUrl?: string;
    tags?: string[];
    mood?: string;
    createdAt: string;
}

export interface JournalQuestion {
    id: string;
    text: string;
}

export interface JournalCategory {
    slug: string;
    title: string;
    icon: string;
    color: string;
    questions: JournalQuestion[];
}
