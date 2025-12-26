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
        You are an advanced AI Productivity Coach for a high-performance individual.
        Your goal is to help the user achieve their Identity Goals and manage their daily Tasks.
        
        CURRENT CONTEXT:
        - IDENTITY GOALS (Long Term): ${JSON.stringify(goals.filter((g: any) => g.type === 'identity'))}
        - ACTIVE GOALS: ${JSON.stringify(goals.filter((g: any) => g.type !== 'identity'))}
        - PENDING TASKS: ${JSON.stringify(tasks)}
        
        USER MESSAGE: "${message}"

        INSTRUCTIONS:
        1. Analyze the user's message. Is it a reflection? A new task? A goal update? Just a chat?
        2. Respond with an empathetic, coaching-style message (short, direct, inspiring).
        3. If the user implies an action (e.g., "I need to buy milk", "I want to run a marathon"), generate a STRUCTURED ACTION.
        
        OUTPUT FORMAT (JSON ONLY):
        {
            "reply": "Your conversational response here...",
            "actions": [
                {
                    "type": "create_task" | "update_goal" | "create_goal",
                    "payload": { ...fields matching DB schema... },
                    "label": "Brief description for UI button"
                }
            ],
            "shouldRefresh": boolean (true if you generated actions that change DB state)
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
