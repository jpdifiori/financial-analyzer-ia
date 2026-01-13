require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ Error: GEMINI_API_KEY no encontrada en .env.local");
        process.exit(1);
    }

    console.log(`🔍 Probando clave: ${apiKey.substring(0, 7)}...`);

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = "Hola, responde con la palabra 'OK' si recibes este mensaje.";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("✅ Respuesta de Gemini:", text);
        if (text.includes("OK")) {
            console.log("🌟 ¡La API de Gemini está funcionando correctamente!");
        } else {
            console.log("⚠️ Recibí una respuesta diferente, pero la conexión fue exitosa.");
        }
    } catch (error) {
        console.error("❌ Error al conectar con Gemini:");
        console.error(error.message || error);

        if (error.message?.includes("API_KEY_INVALID")) {
            console.error("👉 La clave de API parece no ser válida.");
        } else if (error.message?.includes("quota")) {
            console.error("👉 Has superado la cuota gratuita de la API.");
        }
    }
}

testGemini();
