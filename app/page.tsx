"use client";

import { useState, useEffect } from "react";
import { UploadZone } from "@/components/upload-zone";
import { AnalysisDashboard } from "@/components/analysis-dashboard";
import { useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { supabase } from "@/lib/supabase";
import { IncomeTracker } from "@/components/income-tracker";

import { FixedExpenses } from "@/components/fixed-expenses";
import { VariableExpenses } from "@/components/variable-expenses";

import { BudgetManager } from "@/components/budget-manager";
import { SavingsGoals } from "@/components/savings-goals";
import { toast } from "sonner";
import { NetWorthChart } from "@/components/net-worth-chart";
import { PartnerManager } from "@/components/partner-manager";
import { OverviewDashboard } from "@/components/overview-dashboard";
import { CardManager } from "@/components/card-manager";
import { LandingPage } from "@/components/landing-page";
import { BalanceSheet } from "@/components/balance-sheet";
import { SideNav } from "@/components/side-nav";
import { ModuleSelector } from "@/components/module-selector";
import { Calendar } from "lucide-react";

export default function Home() {
    const searchParams = useSearchParams();
    const [session, setSession] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [showAuth, setShowAuth] = useState(false); // [NEW] To toggle Login form

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setAuthLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const [activeTab, setActiveTab] = useState<"dashboard" | "fixed" | "variable" | "card" | "income" | "budget" | "goals" | "networth" | "partner" | "balance">("dashboard");
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    const [file, setFile] = useState<File | null>(null);
    const [isPaid, setIsPaid] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisData, setAnalysisData] = useState<any | null>(null);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        window.location.reload();
    };

    useEffect(() => {
        const success = searchParams.get("success");
        const session_id = searchParams.get("session_id");
        if (success && session_id) {
            setIsPaid(true);
            setSessionId(session_id);
        }
    }, [searchParams]);

    const handleFileSelect = (selectedFile: File | null) => { setFile(selectedFile); };

    const handlePay = async () => {
        if (!file) return;
        try {
            const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name }) });
            const data = await res.json();
            if (data.url) window.location.href = data.url; else toast.error(data.error);
        } catch (error) { toast.error("Error pago"); }
    };

    const handleAnalyze = async () => {
        if (!file || !sessionId) { toast.error("Paga primero"); return; }
        setIsLoading(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = reader.result as string;
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ pdfBase64: base64, sessionId: sessionId }) });
                const data = await res.json();
                if (res.ok) setAnalysisData(data); else toast.error(data.error);
                setIsLoading(false);
            };
        } catch (e) { toast.error("Error al analizar"); setIsLoading(false); }
    };

    if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">Cargando experiencia...</div>;

    // Logic for unauthenticated users
    if (!session) {
        if (showAuth) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 animate-in fade-in">
                    <button
                        onClick={() => setShowAuth(false)}
                        className="absolute top-4 left-4 text-sm text-slate-500 hover:text-slate-900"
                    >
                        ← Volver al Inicio
                    </button>
                    <AuthForm />
                </div>
            );
        }
        // Default: Show Landing Page
        return <LandingPage onLoginClick={() => setShowAuth(true)} />;
    }

    // Authenticated Module Selection (New Home)
    return (
        <ModuleSelector
            userEmail={session.user.email}
            onLogout={handleLogout}
        />
    );
}

const NAV_LABELS: Record<string, string> = {
    dashboard: "Resumen General",
    balance: "Balance Patrimonial",
    card: "Análisis de Tarjetas",
    income: "Gestión de Ingresos",
    fixed: "Gastos Fijos",
    variable: "Gastos Variables",
    budget: "Presupuestos Mensuales",
    goals: "Metas de Ahorro",
    partner: "Socios y Pareja"
};
