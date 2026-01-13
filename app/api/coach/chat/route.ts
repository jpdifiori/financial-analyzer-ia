import { getGeminiModel } from "@/lib/gemini";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { message, context } = await req.json();
        const { goals, tasks } = context || { goals: [], tasks: [] };

        // Initialize Gemini & Supabase
        // Lazy load inside handler
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // 1. Construct Contextual Prompt
        // We feed the AI the current state so it can "see" what the user sees.
        const systemPrompt = `
        You are an advanced Financial Advisor specialized in Purchase Analysis.
        Your goal is to help the user evaluate if a potential purchase (personal or business) is financially sound based on their current context.

        CURRENT CONTEXT:
        - IDENTITY GOALS: ${JSON.stringify(goals.filter((g: any) => g.type === 'identity'))}
        - ACTIVE GOALS: ${JSON.stringify(goals.filter((g: any) => g.type !== 'identity'))}
        - PENDING TASKS: ${JSON.stringify(tasks)}

        USER MESSAGE: "${message}"

        INSTRUCTIONS:
        1. If the user mentions a potential purchase (e.g., "I want to buy a new laptop", "Should I get that watch?"), analyze it.
        2. Ask for details if missing: Amount, Category, Urgency/Importance.
        3. Compare the purchase against their goals. Does it hinder their long-term plans?
        4. Be direct, objective, and slightly skeptical (act as a "voice of reason").
        5. If the user is just chatting, politely redirect them to analyze a purchase.

        OUTPUT FORMAT (JSON ONLY):
        {
            "reply": "Your conversational response here...",
            "actions": [
                {
                    "type": "create_task",
                    "payload": { "title": "Ahorrar para [item]", "priority": "medium" },
                    "label": "Crear plan de ahorro"
                }
            ],
            "shouldRefresh": boolean
        }
        
        CRITICAL: Return ONLY valid JSON.
        `;

        // 2. Call Gemini (Centralized)
        const model = getGeminiModel();

        const result = await model.generateContent(systemPrompt);
        const responseText = result.response.text();

        // Manual Clean & Parse
        const cleanedText = responseText.replace(/```json|```/g, "").trim();
        const aiResponse = JSON.parse(cleanedText);

        // 3. Server-Side Action Execution
        if (aiResponse.actions && aiResponse.actions.length > 0) {
            const { data: { user } } = await supabase.auth.getUser(req.headers.get("Authorization")?.split(" ")[1] || "");

            if (user) {
                for (const action of aiResponse.actions) {
                    if (action.type === 'create_task') {
                        await supabase.from('tasks').insert({
                            user_id: user.id,
                            title: action.payload.title,
                            priority: action.payload.priority || 'medium',
                            goal_id: action.payload.goal_id
                        });
                    }
                    if (action.type === 'create_goal') {
                        await supabase.from('goals').insert({
                            user_id: user.id,
                            title: action.payload.title,
                            type: action.payload.type || 'monthly',
                            description: action.payload.description
                        });
                    }
                }
                aiResponse.shouldRefresh = true;
            }
        }

        return NextResponse.json(aiResponse);

    } catch (error: any) {
        console.error("Coach API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
