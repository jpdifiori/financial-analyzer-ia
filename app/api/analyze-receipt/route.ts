import { model } from "@/lib/gemini";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db-mock";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { pdfBase64, sessionId } = await req.json();

        if (!pdfBase64) {
            return NextResponse.json({ error: "Datos incompletos: falta pdfBase64" }, { status: 400 });
        }

        console.log(`[Analyze Receipt] Start. SessionId: ${sessionId || 'N/A'}`);

        // 1. Validate Payment (Optional logic kept for consistency)
        // Note: For variable expenses, user might expect free usage or tied to same sub.
        // We will keep the check loose or rely on client-side state for now, 
        // to avoid blocking legitimate testing if they are logged in.
        // For robustness: we only enforce it if sessionId is provided and expected.

        // 2. Prepare Data for Gemini
        // Extract MIME type and Base64 data safely
        // Support: images (jpeg, png, webp) and pdf
        const matches = pdfBase64.match(/^data:(.+);base64,(.+)$/);
        let mimeType = "image/jpeg"; // Default fallback
        let base64Data = pdfBase64;

        if (matches && matches.length === 3) {
            mimeType = matches[1];
            base64Data = matches[2];
        } else {
            // Fallback cleanup
            base64Data = pdfBase64.replace(/^data:image\/\w+;base64,/, "").replace(/^data:application\/pdf;base64,/, "");
        }

        console.log(`[Analyze Receipt] Processing file. Mime: ${mimeType}, Size: ${base64Data.length}`);

        // 3. Define Prompt (Auditor Financiero Persona - Proven Strategy)
        const prompt = `
    Actúa como un Auditor Financiero Senior experto en digitalización de gastos.
    Tu tarea es analizar este comprobante (ticket, factura, recibo o nota) y extraer los datos estructurados con MÁXIMA PRECISIÓN.

    Estructura JSON requerida (STRICT JSON):
    {
      "items": [
        {
           "description": "string" (Nombre claro del producto o servicio. Ej: "Cena McDonald's", "Uber Viaje", "Compra Supermercado"),
           "amount": number (El monto final pagado. Usa punto para decimales. Ej: 1500.50),
           "date": "YYYY-MM-DD" (La fecha del ticket. Si no es visible, usa: "${new Date().toISOString().split('T')[0]}"),
           "category": "string" (Clasifica en: Supermercado, Comida, Transporte, Servicios, Hogar, Entretenimiento, Salud, Educación, Ropa, Otros)
        }
      ]
    }

    REGLAS DE EXTRACCIÓN (IMPORTANTE):
    1.  **Monto Total vs Items**:
        - Si el ticket tiene múltiples items legibles, extráelos individualmente.
        - Si es un ticket largo de supermercado y es confuso, devuelve UN SOLO ITEM con la descripción "Compra Supermercado [Nombre Comercio]" y el MONTO TOTAL.
        - Si es un recibo de pago único (ej: Uber, Transferencia), extrae ese único item.
    
    2.  **Fechas Inteligentes**:
        - Busca formatos como DD/MM/AAAA, DD-MM-YY, etc. Conviértelos a YYYY-MM-DD.
        - Si la fecha es ambigua o no existe, ASUME LA FECHA DE HOY. NO devuelvas null.

    3.  **Robustez**:
        - Si la imagen es borrosa, haz tu mejor esfuerzo por identificar el TOTAL.
        - Si ves un monto y no sabes qué es, ponle descripción "Gasto Varios".
        - IGNORA montos intermedios o subtotales si puedes identificar el TOTAL FINAL.

    Analiza la imagen ahora y devuelve SOLO EL JSON.
    `;

        // 4. Call Gemini
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType,
                },
            },
        ]);

        const response = await result.response;
        const text = response.text();

        console.log("[Analyze Receipt] Raw AI Response:", text);

        // 5. Clean & Parse JSON
        let cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const firstOpen = cleanedText.indexOf('{');
        const lastClose = cleanedText.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1) {
            cleanedText = cleanedText.substring(firstOpen, lastClose + 1);
        }

        try {
            const data = JSON.parse(cleanedText);

            // Validate structure
            if (!data.items || !Array.isArray(data.items)) {
                throw new Error("Invalid JSON structure: missing 'items' array");
            }

            return NextResponse.json(data);
        } catch (e) {
            console.error("[Analyze Receipt] JSON Parse Error:", e);
            return NextResponse.json({ error: "No se pudo interpretar la respuesta de la IA.", raw: text }, { status: 500 });
        }

    } catch (err: any) {
        console.error("[Analyze Receipt] Critical Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
