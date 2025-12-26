import { getGeminiModel } from "@/lib/gemini";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { files, cardId } = await req.json();

        if (!files || files.length === 0) {
            return NextResponse.json({ error: "No files provided" }, { status: 400 });
        }

        // Lazy init Supabase to avoid build-time crashes if envs are missing in Vercel build context
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Using gemini-2.0-flash for Audit (Multi-modal)
        // Lazy load model inside handler to avoid build-time errors
        const model = getGeminiModel();

        const prompt = `
        Actúa como el Consultor Financiero de Inteligencia Artificial más avanzado del mundo.
        
        OBJETIVO: Realizar una auditoría forense de los resúmenes de tarjeta de crédito proporcionados.
        DEBES extraer y calcular métricas para generar un reporte de "20 Puntos de Análisis".
        
        Analiza las imágenes y devuelve un JSON con la siguiente estructura EXACTA:
        
        {
            "global_summary": {
                "total_debt": 0,
                "total_spent_period": 0,
                "payments_vs_purchases_ratio": 0.0,
                "total_interest_paid": 0
            },
            "debt_evolution": [
                { "month": "YYYY-MM", "balance": 0 }
            ],
            "card_comparison": { // Si hay varias tarjetas detectadas o solo una
                "avg_debt": 0,
                "avg_spend": 0,
                "utilization_rate": 0.0
            },
            "categories": [
                { "name": "Supermercado", "total": 0, "pct": 0, "trend": "up/down" }
            ],
            "top_merchants": [
                { "name": "Merchant Name", "total": 0, "count": 0 }
            ],
            "emotional_spending": [
                { "item": "Item Name", "amount": 0, "date": "YYYY-MM-DD", "tag": "Impulso/Emocional/Social" }
            ],
            "ghost_expenses": [
                { "item": "Subscription/Fee", "amount": 0, "frequency": "monthly/annual", "risk": "high/medium" }
            ],
            "monthly_average": {
                "total": 0,
                "breakdown_by_category": { "Food": 0, "Tech": 0 }
            },
            "interest_vs_principal": {
                "interest_amount": 0,
                "principal_amount": 0
            },
            "alerts": [
                { "type": "High Debt Growth", "message": "Tu deuda creció 15% vs mes anterior", "level": "critical" }
            ],
            "forecast": {
                 "next_month_debt": 0,
                 "three_month_debt": 0,
                 "six_month_debt": 0
            },
            "payment_habits": {
                "full_payment_pct": 0,
                "min_payment_pct": 0
            },
            "day_week_heatmap": [
                { "day": "Monday", "spend": 0, "hour_peak": "18:00" }
            ],
            "subscriptions": [
                { "name": "Netflix", "amount": 0, "cycle": "monthly" }
            ],
            "amount_segmentation": {
                "micro": 0, // < $20
                "medium": 0, // $20-$100
                "high": 0 // > $100
            },
            "strategies": {
                "recommendation_1": "...",
                "recommendation_2": "..."
            }
        }
        
        REGLAS CRÍTICAS:
        1. Respuesta 100% en ESPAÑOL.
        2. Sé creativos con los datos faltantes: si no ves el día exacto, estima basado en el contexto.
        3. Identifica "Gastos Fantasma" (comisiones, micro-suscripciones).
        4. Identifica "Gastos Emocionales" (Delivery nocturno, compras en fines de semana, juegos).
        5. Forecast: Proyecta linealmente basado en la tendencia de los últimos meses.
        6. Devuelve SOLO JSON válido sin markdown.
        `;

        // 2. Prepare Parts
        const imageParts = files.map((base64: string) => {
            const mimeType = base64.startsWith("data:") ? base64.split(";")[0].split(":")[1] : "application/pdf";
            const data = base64.split(",")[1];
            return {
                inlineData: {
                    data,
                    mimeType
                }
            };
        });

        // 3. Call Gemini
        const result = await model.generateContent([prompt, ...imageParts]);
        const responseText = result.response.text();

        // 4. Parse
        const cleanedText = responseText.replace(/```json|```/g, "").trim();
        const reportJson = JSON.parse(cleanedText);

        // 5. Save
        const { data: { user } } = await supabase.auth.getUser(req.headers.get("Authorization")?.split(" ")[1] || "");

        if (user) {
            await supabase.from("card_audits").insert({
                user_id: user.id,
                card_id: cardId,
                report_json: reportJson,
                analyzed_months: files.length
            });
        }

        return NextResponse.json({ report: reportJson });

    } catch (error: any) {
        console.error("Audit Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
