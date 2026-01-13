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
        const { messages, entryDate } = body;

        const systemPrompt = `Eres un Guía de Introspección y Bitácora Personal. Tu objetivo es ayudar al usuario a profundizar en sus pensamientos, emociones y aprendizajes del día: ${entryDate}.

        PRINCIPIOS DE INTERACCIÓN:
        1. Escucha profunda: Valida las emociones del usuario.
        2. Preguntas Socráticas: No des consejos genéricos, haz preguntas que obliguen al usuario a mirar adentro.
        3. Identifica patrones: Si el usuario menciona algo recurrente, señálalo con suavidad.
        4. Fomenta la gratitud y la autocrítica constructiva.

        TU MISIÓN:
        - Mantén una conversación fluida.
        - Detecta cuándo el usuario ha terminado de reflexionar, quiere guardar el día, o cuando tú consideres que se ha llegado a una síntesis valiosa.
        - Cuando detectes que la entrada debe persistirse (isFinalEntry: true), genera un resumen estructurado y reflexiones profundas.

        FORMATO DE SALIDA (JSON):
        {
          "message": "Tu respuesta conversacional o pregunta disparadora.",
          "isFinalEntry": boolean,
          "aiFeedback": {
            "recommendations": ["Sugerencia de acción para mañana"],
            "workPoints": ["Temas para seguir explorando"],
            "focusAreas": ["Conceptos clave de hoy"],
            "alerts": ["Patrones negativos o riesgos emocionales detectados"],
            "assistance": "Un mensaje de cierre cálido y sabio",
            "mood": "Estado emocional (ej: 'Vibrante', 'Melancólico', 'Determinado')",
            "summary": "Un título corto y potente para esta entrada",
            "fullReflection": "Una reflexión profunda (2-3 párrafos) que sintetiza lo aprendido hoy"
          }
        }
        IMPORTANTE: Solo pon isFinalEntry: true si sientes que la conversación ha cerrado un ciclo o el usuario explícitamente quiere guardar su nota.
        `;

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                {
                    role: "model", parts: [{
                        text: JSON.stringify({
                            message: "¿Qué tienes en mente para hoy? ¿Hubo algo que te hizo detenerte a pensar?",
                            isFinalEntry: false
                        })
                    }]
                }
            ],
        });

        // Add history
        // Note: history in startChat is better for context
        const userMessages = messages.filter((m: any) => m.role === "user");
        const lastUserMessage = userMessages[userMessages.length - 1].content;

        const result = await chat.sendMessage(lastUserMessage);
        const response = await result.response;
        const text = response.text();

        try {
            const parsed = JSON.parse(text);
            return NextResponse.json(parsed);
        } catch (e) {
            return NextResponse.json({
                message: text,
                isFinalEntry: false
            });
        }
    } catch (error: any) {
        console.error("Journal Assistant API Error:", error);
        return NextResponse.json({
            error: "Error en el guía de bitácora",
            details: error.message
        }, { status: 500 });
    }
}
