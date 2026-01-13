"use server";

import { getGeminiModel } from "@/lib/gemini";

export interface AIAnalysisResult {
    category: "action" | "mission" | "delegate";
    rationale: string;
    suggestedSubtasks?: string[];
    priority?: "low" | "medium" | "high" | "critical";
    estimatedTime?: number; // in minutes
}

export async function analyzeTask(title: string, description?: string): Promise<AIAnalysisResult> {
    const model = getGeminiModel();

    const prompt = `
        Analiza la siguiente tarea del Inbox de un sistema de gestión personal (Command).
        
        Título: "${title}"
        Descripción: "${description || "Sin descripción"}"
        
        Debes categorizarla en una de estas 3 opciones:
        1. "action": Es una tarea única, clara y ejecutable en un solo bloque de tiempo (ej: "Llamar a Juan", "Comprar leche").
        2. "mission": Es un mini-proyecto. Requiere múltiples pasos, tiene cierta complejidad o es un objetivo que se desglosa en subtareas (ej: "Organizar viaje a Japón", "Lanzar nueva web").
        3. "delegate": Es algo que puede ser realizado por otra persona o servicio, o que requiere seguimiento de un tercero.
        
        Responde estrictamente en formato JSON con la siguiente estructura:
        {
            "category": "action" | "mission" | "delegate",
            "rationale": "Breve explicación de por qué esta categoría",
            "suggestedSubtasks": ["Lista", "de", "subtareas"] (solo si es mission),
            "priority": "low" | "medium" | "high" | "critical",
            "estimatedTime": número_en_minutos (estimado para la tarea o primer paso)
        }
        
        Tu respuesta debe ser UNICAMENTE el objeto JSON, sin Markdown ni explicaciones adicionales.
    `;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Clean up possible markdown artifacts
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No se pudo obtener un JSON válido de la IA");

        const data = JSON.parse(jsonMatch[0]) as AIAnalysisResult;
        return data;
    } catch (error) {
        console.error("Error in AI Analysis:", error);
        throw new Error("Error al analizar la tarea con IA");
    }
}
