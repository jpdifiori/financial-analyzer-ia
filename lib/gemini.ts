import { GoogleGenerativeAI } from "@google/generative-ai";

export const getGeminiModel = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("CRITICAL: GEMINI_API_KEY is not defined in environment variables.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Centralized model configuration
    return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
};
