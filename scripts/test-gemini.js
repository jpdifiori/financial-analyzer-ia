
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
// Load env manually
try {
    const envConfig = fs.readFileSync(".env.local", "utf8");
    envConfig.split("\n").forEach(line => {
        const [key, value] = line.split("=");
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) { console.warn("No .env.local found"); }

async function testGemini(filePath) {
    console.log(`Testing Gemini with file: ${filePath}`);

    if (!process.env.GEMINI_API_KEY) {
        console.error("❌ GEMINI_API_KEY is missing in .env.local");
        return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Using 1.5 Flash as decided
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        const fileBuffer = fs.readFileSync(filePath);
        const base64Data = fileBuffer.toString("base64");

        // Determine mime type roughly
        const ext = path.extname(filePath).toLowerCase();
        let mimeType = "image/jpeg";
        if (ext === ".png") mimeType = "image/png";
        if (ext === ".pdf") mimeType = "application/pdf";
        if (ext === ".webp") mimeType = "image/webp";

        console.log(`MimeType: ${mimeType}`);

        const prompt = `
    Actúa como un Auditor Financiero Senior experto en digitalización de gastos.
    Tu tarea es analizar este comprobante (ticket, factura, recibo o nota) y extraer los datos estructurados con MÁXIMA PRECISIÓN.

    Estructura JSON requerida (STRICT JSON):
    {
      "items": [
        {
           "description": "string" (Nombre claro del producto o servicio. Ej: "Cena McDonald's", "Uber Viaje", "Compra Supermercado"),
           "amount": number (El monto final pagado. Usa punto para decimales),
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

        console.log("Sending request to Gemini...");
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
        console.log("\n--- RAW RESPONSE ---");
        console.log(text);
        console.log("--------------------\n");

        // Try parsing
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const json = JSON.parse(cleanedText);
        console.log("✅ JSON Parsed Successfully:");
        console.log(JSON.stringify(json, null, 2));

    } catch (error) {
        console.error("❌ Error during test:", error);
    }
}

// Get file from arg
const fileArg = process.argv[2];
if (!fileArg) {
    console.log("Usage: node scripts/test-gemini.js <path-to-image>");
} else {
    testGemini(fileArg);
}
