
const fs = require('fs');

// Load env manually
let apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    try {
        const envConfig = fs.readFileSync(".env.local", "utf8");
        envConfig.split("\n").forEach(line => {
            const [key, value] = line.split("=");
            if (key && key.trim() === "GEMINI_API_KEY") {
                apiKey = value.trim();
            }
        });
    } catch (e) {
        console.warn("No .env.local found");
    }
}

async function checkModels() {
    if (!apiKey) {
        console.error("❌ No API Key found.");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    console.log("Fetching models from:", url.replace(apiKey, "HIDDEN_KEY"));

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("\n✅ Available Models:");
            data.models.forEach(m => {
                // Filter for any gemini model
                if (m.name.toLowerCase().includes("gemini")) {
                    console.log(`- ${m.name} (${m.displayName})`);
                }
            });

            console.log("\n(Full list contains " + data.models.length + " models)");
        } else {
            console.error("❌ No models found in response:", data);
        }
    } catch (error) {
        console.error("❌ Error fetching models:", error);
    }
}

checkModels();
