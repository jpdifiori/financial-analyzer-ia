import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

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
        <html lang="es">
            <body className={cn(inter.className, "min-h-screen antialiased bg-slate-50")}>
                <main className="container mx-auto px-4 py-8">
                    {children}
                </main>
            </body>
        </html>
    );
}
