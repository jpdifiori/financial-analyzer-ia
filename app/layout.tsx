import type { Metadata } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { FinancialAdvisorChat } from "@/components/financial-advisor-chat";
import { JournalAssistantChat } from "@/components/journal/journal-assistant-chat";

import { Toaster } from "sonner";
import { LanguageProvider } from "@/context/language-context";
import { GlobalLayout } from "@/components/layout/global-layout";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
    title: "Analizador Financiero IA",
    description: "Analiza tus gastos con IA",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es" className={cn(inter.variable, playfair.variable, jetbrains.variable)}>
            <body className={cn(inter.className, "min-h-screen antialiased bg-[#09090b] text-slate-100")}>
                <Toaster richColors position="top-center" />
                <LanguageProvider>
                    <GlobalLayout>
                        {children}
                    </GlobalLayout>
                    <FinancialAdvisorChat />
                    <JournalAssistantChat />
                </LanguageProvider>
            </body>
        </html>
    );
}
