import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return NextResponse.json({
            error: "Configuración incompleta",
            details: "La clave de API de Gemini no está configurada"
        }, { status: 500 });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        const body = await req.json();
        const { messages, challengeContext } = body;

        const systemPrompt = `Eres un Asistente Experto en Misogis. Tu objetivo es ser el "Sherpa" del usuario en su desafío personal épico.
        
        CONTEXTO DEL MISOGI ACTUAL:
        ${JSON.stringify(challengeContext)}

        TU MISIÓN:
        1. Responde preguntas sobre el reto.
        2. Sugiere contenido faltante (habilidades, equipo, hitos, tareas).
        3. Identifica incoherencias o áreas de mejora.
        4. Sé motivador pero exigente.

        REGLA DE NO DUPLICADOS (CRÍTICA):
        - Antes de sugerir un nuevo recurso (habilidad/equipo) o ítem del roadmap (hito/tarea), verifica si ya existe algo similar en el CONTEXTO.
        - Si algo tiene un 80% de similitud semántica, NO LO SUGIERAS como nuevo. Refiérete al ítem existente.

        FORMATO DE SALIDA (JSON):
        Debes responder SIEMPRE en este formato JSON:
        {
          "message": "Tu respuesta conversacional al usuario.",
          "suggestedActions": [
            {
              "type": "add_resource",
              "data": { "title": "...", "type": "skill" | "equipment" }
            },
            {
              "type": "add_roadmap",
              "data": { "title": "...", "type": "milestone" | "task" | "habit" }
            }
          ]
        }

        Instrucciones para suggestedActions:
        - Solo inclúyelas si el usuario pidió ayuda para planificar o si detectas una necesidad clara.
        - Asegúrate de que los títulos sean breves y potentes.
        - NUNCA sugieras algo que ya esté en el contexto.
        `;

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                {
                    role: "model", parts: [{
                        text: JSON.stringify({
                            message: "Hola, soy tu asistente de Misogi. Tengo todo el contexto de tu desafío. ¿En qué área necesitas que profundicemos hoy?",
                            suggestedActions: []
                        })
                    }]
                },
                ...messages.slice(0, -1).map((m: any) => ({
                    role: m.role === "user" ? "user" : "model",
                    parts: [{ text: m.role === "model" ? JSON.stringify(m.content) : m.content }]
                }))
            ],
        });

        const lastMessage = messages[messages.length - 1].content;
        const result = await chat.sendMessage(lastMessage);
        const response = await result.response;
        const text = response.text();

        try {
            const parsed = JSON.parse(text);
            return NextResponse.json(parsed);
        } catch (e) {
            return NextResponse.json({
                message: text,
                suggestedActions: []
            });
        }
    } catch (error: any) {
        console.error("Assistant API Error:", error);
        return NextResponse.json({
            error: "Error en el asistente",
            details: error.message
        }, { status: 500 });
    }
}
