import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function POST(req: Request) {
    try {
        const { messages, context } = await req.json();

        const systemPrompt = `Eres un Asesor Financiero experto y proactivo. 
        Tu objetivo es ayudar al usuario a mejorar su salud financiera.
        REGLAS ESTRICTAS:
        1. Solo puedes hablar de temas FINANCIEROS (deudas, ahorro, inversión, compras, presupuesto).
        2. Si el usuario pregunta algo no financiero, debes decir: "Lo siento, como tu asesor financiero solo puedo ayudarte con temas relacionados a tu dinero y economía. ¿Te gustaría analizar una compra o ver una estrategia de deudas?".
        3. Siempre sé analítico. Si preguntan por una compra, analiza cuotas, inflación y costo de oportunidad.
        4. Si preguntan por deudas, menciona métodos como "Bola de Nieve" o "Avalancha".
        
        CONTEXTO DEL USUARIO (si está disponible):
        ${JSON.stringify(context)}
        `;

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
        const result = await chat.sendMessage(lastMessage);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ content: text });
    } catch (error) {
        console.error("Advisor Chat Error:", error);
        return NextResponse.json({ error: "Error en la consulta del asesor" }, { status: 500 });
    }
}
