// Simple in-memory store for MVP demo purposes.
// In production, use Supabase/Postgres/etc.

class MockDB {
    private paidSessions: Set<string>;

    constructor() {
        this.paidSessions = new Set();
    }

    addPaidSession(sessionId: string) {
        this.paidSessions.add(sessionId);
    }

    hasPaid(sessionId: string): boolean {
        return this.paidSessions.has(sessionId);
    }
}

// Singleton instance
export const db = new MockDB();
