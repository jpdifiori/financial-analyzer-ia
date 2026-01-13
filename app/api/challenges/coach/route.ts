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
        const { messages, currentData } = body;

        const systemPrompt = `Eres un Coach de Misogis experto y altamente motivador. 
        Un Misogi es un desafío personal épico que tiene dos reglas: 
        1. Debes tener un 50% de probabilidad de fallar.
        2. No puede ser peligroso de forma imprudente.

        Tu objetivo es ayudar al usuario a definir su Misogi mediante una conversación profunda pero ágil.

        INSTRUCCIONES DE CONVERSACIÓN:
        1. **Una pregunta a la vez**: Crucial para no abrumar.
        2. **Sé un Coach, no un formulario**: Haz preguntas que hagan pensar al usuario sobre sus miedos, sus deseos de cambio y lo que realmente le importa.
        3. **Recolección Progresiva**: Necesitamos obtener:
           - Nombre del desafío.
           - Motivación (por qué lo hace).
           - Transformación (en quién se convertirá al terminar).
           - Recursos necesarios (habilidades o equipo).
           - Hitos o tareas iniciales (roadmap).
        4. **Validación**: Si el desafío suena muy fácil, empuja al usuario un poco más. Si suena imposible, ayúdale a estructurarlo.

        FORMATO DE SALIDA (JSON):
        Debes responder SIEMPRE en formato JSON con la siguiente estructura:
        {
          "message": "Tu mensaje motivador o pregunta para el usuario",
          "extractedData": {
            "name": "Nombre si ya se definió o string vacío",
            "motivation": "Motivación si ya se definió",
            "transformation": "Transformación si ya se definió",
            "resources": [{ "title": "...", "type": "skill" | "equipment" }],
            "roadmap": [{ "title": "...", "type": "milestone" | "task" | "habit" }]
          }
        }

        CONTEXTO ACTUAL:
        ${JSON.stringify(currentData || {})}

        IMPORTANTE: No te presentes cada vez. Mantén la fluidez de la conversación. Si ya tienes suficiente información para empezar, puedes sugerir un Roadmap inicial.
        `;

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                {
                    role: "model", parts: [{
                        text: JSON.stringify({
                            message: "¡Hola! Estoy aquí para ayudarte a diseñar tu próximo Misogi. Algo que te desafíe de verdad. Para empezar... si pudieras lograr algo este año que hoy te parece casi imposible, ¿qué sería?",
                            extractedData: {}
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
            // Fallback en caso de que no devuelva JSON válido a pesar de la config
            return NextResponse.json({
                message: text,
                extractedData: currentData || {}
            });
        }
    } catch (error: any) {
        console.error("Coach API Error:", error);
        return NextResponse.json({
            error: "Error en el coach",
            details: error.message
        }, { status: 500 });
    }
}
