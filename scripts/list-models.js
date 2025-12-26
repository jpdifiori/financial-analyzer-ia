
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

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

async function listModels() {
    if (!process.env.GEMINI_API_KEY) {
        console.error("❌ GEMINI_API_KEY is missing");
        return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    try {
        // Access the model manager to list models
        // Note: This API might vary by SDK version, checking allow-list
        console.log("Fetching available models...");
        // Not all SDK versions expose listModels cleanly in main entry, 
        // but let's try a simple generation to 'gemini-1.5-flash' to verify it works 
        // or catching the error to see suggestions.

        // Actually standard way is usually via API call, but SDK wraps it.
        // Let's just try to instantiate the model and run a 'hello' 
        // If that works, we are good.

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log("✅ gemini-1.5-flash is WORKING!");
        console.log(result.response.text());

    } catch (error) {
        console.error("❌ Error:", error.message);
        if (error.message.includes("404")) {
            console.log("Model not found. Try 'gemini-pro' or 'gemini-1.0-pro'.");
        }
    }
}

listModels();
