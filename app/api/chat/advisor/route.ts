import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    console.log("Advisor API: Request received");
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("Advisor API: GEMINI_API_KEY is missing in environment variables");
        return NextResponse.json({
            error: "Configuración incompleta",
            details: "La clave de API de Gemini no está configurada en .env.local"
        }, { status: 500 });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const body = await req.json();
        const { messages, context } = body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            console.error("Advisor API: Invalid messages format", body);
            return NextResponse.json({ error: "Mensajes inválidos" }, { status: 400 });
        }

        const systemPrompt = `Eres un Asesor Financiero experto, proactivo y altamente interactivo. 
        Tu objetivo es ayudar al usuario a mejorar su salud financiera de forma progresiva.

        ESTILO DE CONVERSACIÓN:
        1. **Una pregunta a la vez**: NUNCA hagas múltiples preguntas en un solo mensaje. 
        2. **Interacciones Cortas**: Sé breve y directo. No abrumes al usuario con párrafos largos o listas extensas.
        3. **Recolección Progresiva**: Ve pidiendo información poco a poco. Permite que el usuario te cuente su situación en pasos.
        4. **Acción**: Si detectas una oportunidad de ahorro o mejora, menciónala brevemente y pregunta si el usuario quiere profundizar en eso.

        REGLAS ESTRICTAS:
        1. Solo puedes hablar de temas FINANCIEROS (deudas, ahorro, inversión, compras, presupuesto).
        2. Si el usuario pregunta algo no financiero, debes decir: "Lo siento, como tu asesor financiero solo puedo ayudarte con temas relacionados a tu dinero y economía. ¿Te gustaría analizar una compra o ver una estrategia de deudas?".
        3. Siempre sé analítico. Si preguntan por una compra, analiza cuotas, inflación y costo de oportunidad.
        4. Si preguntan por deudas, menciona métodos como "Bola de Nieve" o "Avalancha".
        
        CONTEXTO DEL USUARIO (si está disponible):
        ${JSON.stringify(context || {})}
        
        IMPORTANTE: No te presentes de nuevo si ya hay historial. Empieza directamente con el análisis o la pregunta siguiente.
        `;

        console.log("Advisor API: Starting chat with Gemini");
        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "Entendido. Soy tu asesor financiero experto. ¿En qué área de tu economía quieres trabajar hoy?" }] },
                ...messages.slice(0, -1).map((m: any) => ({
                    role: m.role === "user" ? "user" : "model",
                    parts: [{ text: m.content }]
                }))
            ],
        });

        const lastMessage = messages[messages.length - 1].content;
        console.log("Advisor API: Sending message:", lastMessage.substring(0, 50) + "...");

        const result = await chat.sendMessage(lastMessage);
        const response = await result.response;
        const text = response.text();

        console.log("Advisor API: Success, returning response");
        return NextResponse.json({ content: text });
    } catch (error: any) {
        console.error("Advisor API: Error details:", error.message || error);
        return NextResponse.json({
            error: "Error en la consulta del asesor",
            details: error.message || "Unknown error"
        }, { status: 500 });
    }
}
