import { model } from "@/lib/gemini";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db-mock";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { pdfBase64, sessionId } = await req.json();

    if (!pdfBase64 || !sessionId) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // 1. Validate Payment
    let paid = db.hasPaid(sessionId);
    if (!paid) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid") {
        db.addPaidSession(sessionId);
        paid = true;
      }
    }
    if (!paid) {
      return NextResponse.json({ error: "Pago no verificado. Por favor realiza el pago." }, { status: 403 });
    }

    // 2. Gemini Analysis
    // Prepare parts for Gemini
    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");

    const prompt = `
    Actúa como un Auditor Financiero Senior. Analiza este resumen de tarjeta de crédito y extrae la siguiente información detallada en formato JSON estricto.
    
    Estructura JSON requerida:
    {
      "summary": {
        "bank_name": "string" (Nombre del Banco, ej: Santander, Galicia, BBVA),
        "card_issuer": "string" (Visa, Mastercard, Amex),
        "card_last_4": "string" (Últimos 4 dígitos si están visibles, o null),
        "total_pay": number,
        "min_pay": number,
        "currency": "string" (ARS/USD),
        "due_date": "YYYY-MM-DD" (Formato ISO),
        "closing_date": "YYYY-MM-DD" (Formato ISO),
        "period": "YYYY-MM" (Mes y año del resumen, ej: 2024-05)
      },
      "items": [
        {
           "date": "YYYY-MM-DD",
           "description": "string" (Nombre del comercio),
           "amount": number,
           "category": "string" (Sugiere una categoría: Supermercado, Farmacia, Transporte, Servicios, Suscripciones, Comida, Ropa, Otros),
           "is_fixed": boolean (true si parece un gasto fijo mensual como Netflix, Gimnasio, Seguro)
        }
      ],
      "installments": [ 
        { 
          "description": "string", 
          "current_installment": number,
          "total_installments": number,
          "amount": number,
          "remaining_amount": number
        }
      ],
      "categories": [
        { "name": "string", "amount": number, "percentage": number }
      ],
      "ghost_expenses": [
        { 
          "description": "string", 
          "amount": number, 
          "date": "string",
          "frequency": "string" (Estimado: Mensual, Bimestral, Anual, Único)
        }
      ],
      "financial_insights": [ "string" ]
    }
    
    IMPORTANTE:
    - Extrae CADA transacción individual en el array "items".
    - Normaliza las fechas a YYYY-MM-DD.
    - Clasifica inteligentemente cada item.
    - Identifica claramente el BANCO y la EMISORA de la tarjeta.
    - IMPORTANTE SOBRE TARJETAS:
      - Busca explícitamente el nombre del banco (ej: Galicia, Santander, BBVA, Macro, ICBC). Si no es obvio, busca en los logos, encabezados o pies de página.
      - Busca la emisora (Visa, Mastercard, American Express).
      - Busca los últimos 4 dígitos de la tarjeta (ej: XXXX-XXXX-XXXX-1234 o terminada en 1234). Si no los encuentras, devuelve null, pero ESFUÉRZATE en buscarlos.
      - Si hay múltiples tarjetas, toma la principal o la del titular.
      - Normaliza los nombres: "Banco Galicia" -> "Galicia", "Visa Platinum" -> "Visa".
    `;

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
