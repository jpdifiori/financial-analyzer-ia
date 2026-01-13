import { getGeminiModel } from "@/lib/gemini";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db-mock";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { pdfBase64, sessionId } = await req.json();

    if (!pdfBase64 || !sessionId) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // 1. Validate Payment - DISABLED BY USER REQUEST
    // const paid = true; 

    // 2. Gemini Analysis
    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");

    const prompt = `
    Actúa como un Auditor Financiero Senior especializado en economía doméstica. Analiza este resumen de tarjeta de crédito y extrae la información siguiendo estrictos principios de "Doble Impacto".

    PRINCIPIOS OBLIGATORIOS:
    1. Gasto del Mes (Cash Flow): La cuota que se paga ESTE mes es un gasto.
    2. Deuda Patrimonial (Pasivo): El total restante de una compra en cuotas es deuda.
    
    Estructura JSON requerida:
    {
      "summary": {
        "bank_name": "string",
        "card_issuer": "string",
        "card_last_4": "string",
        "total_pay": number, 
        "total_ars": number, 
        "total_usd": number, 
        "min_pay": number, 
        "previous_balance": number, // Saldo Anterior
        "total_payments": number, // Pagos realizados durante el período
        "payment_date": "YYYY-MM-DD", // Fecha en que se realizó el pago del resumen anterior
        "interest_rate": "string", 
        "period": "YYYY-MM",
        "closing_date": "YYYY-MM-DD"
      },
      "items": [
        {
           "date": "YYYY-MM-DD",
           "description": "string",
           "amount": number, 
           "currency": "string", 
           "category": "string",
           "is_fixed": boolean,
           "installment_info": { 
               "current": number,
               "total": number
           }
        }
      ],
      "installments": [ 
        { 
          "description": "string", 
          "current_installment": number,
          "total_installments": number,
          "total_amount": number, 
          "remaining_amount": number,
          "installment_amount": number, 
          "currency": "string" 
        }
      ],
      "categories": [ { "name": "string", "amount": number, "currency": "string" } ],
      "ghost_expenses": [
        { 
          "description": "string", 
          "amount": number, 
          "currency": "string", 
          "date": "string",
          "frequency": "string"
        }
      ],
      "interest_alert": {
          "detected": boolean,
          "amount": number,
          "currency": "string",
          "reason": "string", 
          "description": "string" 
      }
    }
    
    INSTRUCCIONES CRÍTICAS:
    - DETECCIÓN DE PAGOS ANTERIORES:
      - Busca "Su pago", "Pago", "Pagos", "Saldo Anterior".
      - Identifica cuánto debía antes (previous_balance) y cuánto pagó (total_payments).
      - Identifica la fecha de ese pago (payment_date).
    - DETECCIÓN DE INTERESES (CRÍTICO):
      - Busca ítems con palabras clave: "INTERES", "FINANCIACION", "PUNITORIOS", "MORA", "REFINANCIACION".
      - Si encuentras alguno, marca "interest_alert.detected" = true y extrae el monto y la razón.
      - Esto es vital para advertir al usuario sobre costos financieros.
    - IDENTIFICACIÓN DE MONEDA:
      - Si ves "USD", "U$S", "US$", o deuda en dólares -> currency: "USD".
      - Si ves "$", "ARS", o deuda en pesos -> currency: "ARS".
    - Si ves "Compra TV 10/12 $10.000 (Total $120.000)":
      -> En "items": Pones $10.000 (es el gasto de hoy) con currency ARS.
      -> En "installments": Pones remaining_amount: $20.000 con currency ARS.
    - Identifica banco, emisora y últimos 4 dígitos.
    - Normaliza fechas a YYYY-MM-DD.
    `;

    // Lazy load model
    const model = getGeminiModel();

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "application/pdf",
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    // Clean markdown code blocks
    let cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const firstOpen = cleanedText.indexOf('{');
    const lastClose = cleanedText.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose !== -1) {
      cleanedText = cleanedText.substring(firstOpen, lastClose + 1);
    }

    try {
      const data = JSON.parse(cleanedText);

      // --- [NEW] SAVE TO SUPABASE ---
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { global: { headers: { Authorization: authHeader } } }
        );

        // 1. Get User
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // 2. [NEW] Check for Duplicates
          // Prevent uploading the same statement (same period, total, AND bank)
          let query = supabase
            .from('analyses')
            .select('id')
            .eq('user_id', user.id)
            .eq('summary->>period', data.summary.period)
            .eq('summary->>total_pay', data.summary.total_pay);

          // Only check bank matching if extracted
          if (data.summary.bank_name) {
            query = query.eq('summary->>bank_name', data.summary.bank_name);
          }

          const { data: existing } = await query.single();

          if (existing) {
            return NextResponse.json({
              error: `Este resumen (${data.summary.bank_name} - ${data.summary.period}) ya fue subido anteriormente.`
            }, { status: 409 });
          }

          // 3. [NEW] Find or Create Credit Card
          let cardId = null;

          // Strategy A: Match by Last 4 Digits (Strongest Signal)
          if (data.summary.card_last_4) {
            const { data: matchByLast4 } = await supabase
              .from('credit_cards')
              .select('id')
              .eq('user_id', user.id)
              .eq('last_4', data.summary.card_last_4)
              .maybeSingle();

            if (matchByLast4) {
              console.log("Card matched by last_4:", data.summary.card_last_4);
              cardId = matchByLast4.id;
            }
          }

          // Strategy B: Match by Bank + Issuer (Secondary Signal) if not found yet
          if (!cardId && data.summary.bank_name && data.summary.card_issuer) {
            const { data: matchByDetails } = await supabase
              .from('credit_cards')
              .select('id')
              .eq('user_id', user.id)
              .ilike('bank_name', data.summary.bank_name) // Case insensitive
              .ilike('issuer', data.summary.card_issuer)
              .maybeSingle();

            if (matchByDetails) {
              console.log("Card matched by Bank+Issuer:", data.summary.bank_name, data.summary.card_issuer);
              cardId = matchByDetails.id;
            }
          }

          // Strategy C: Create New Card if enough info is present and no match found
          if (!cardId) {
            const bankName = data.summary.bank_name || "Banco Desconocido";
            const issuer = data.summary.card_issuer || "Emisor Desconocido";
            const last4 = data.summary.card_last_4 || 'XXXX';

            console.log("Creating NEW card with defaults:", bankName, issuer, last4);

            // Valid colors for UI
            const colors = ['orange', 'slate', 'blue', 'emerald', 'purple', 'rose', 'indigo', 'cyan'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];

            const { data: newCard, error: cardError } = await supabase
              .from('credit_cards')
              .insert({
                user_id: user.id,
                bank_name: bankName,
                issuer: issuer,
                last_4: last4,
                color_theme: randomColor
              })
              .select()
              .single();

            if (!cardError && newCard) {
              cardId = newCard.id;
            } else {
              console.error("Error creating card:", cardError);
            }
          }

          // 4. Save Analysis linked to Card
          const { data: analysis, error: analysisError } = await supabase
            .from('analyses')
            .insert({
              user_id: user.id,
              card_id: cardId, // Link to the card
              summary: data.summary,
              installments: data.installments,
              categories: data.categories,
              ghost_expenses: data.ghost_expenses
            })
            .select()
            .single();

          if (analysisError) {
            console.error("Error saving analysis:", analysisError);
          } else if (analysis && data.items && Array.isArray(data.items)) {
            // 3. Save Expense Items
            const itemsToInsert = data.items.map((item: any) => {
              let validDate = item.date;
              // Simple date validation YYYY-MM-DD
              if (!validDate || !/^\d{4}-\d{2}-\d{2}$/.test(validDate)) {
                validDate = data.summary?.closing_date || null;
              }

              return {
                user_id: user.id,
                analysis_id: analysis.id,
                description: item.description,
                amount: item.amount,
                date: validDate,
                is_fixed: item.is_fixed || false,
                suggested_category: item.category, // [NEW] Saving the text category
                card_id: cardId // [NEW] Link directly to the card
              };
            });

            const { error: itemsError } = await supabase
              .from('expense_items')
              .insert(itemsToInsert);

            if (itemsError) console.error("Error saving items:", itemsError);
          }
        }
      }

      return NextResponse.json(data);
    } catch (e) {
      console.error("Error parsing JSON from Gemini:", text);
      return NextResponse.json({ error: "Error analizando la respuesta de la IA", raw: text }, { status: 500 });
    }

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
