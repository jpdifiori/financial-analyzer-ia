import Stripe from "stripe";

const apiKey = process.env.STRIPE_SECRET_KEY?.trim();

if (!apiKey || !apiKey.startsWith("sk_")) {
    console.error("INVALID STRIPE KEY PATTERN. Ensure it starts with 'sk_' and has no spaces.");
}

export const stripe = new Stripe(apiKey!, {
    apiVersion: "2023-10-16",
    typescript: true,
});
