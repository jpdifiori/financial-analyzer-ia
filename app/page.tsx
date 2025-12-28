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
import { NetWorthChart } from "@/components/net-worth-chart";
import { PartnerManager } from "@/components/partner-manager";
import { OverviewDashboard } from "@/components/overview-dashboard";
import { CardManager } from "@/components/card-manager";
import { LandingPage } from "@/components/landing-page";
import { BalanceSheet } from "@/components/balance-sheet";
import { SideNav } from "@/components/side-nav";

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
            if (data.url) window.location.href = data.url; else alert(data.error);
        } catch (error) { alert("Error pago"); }
    };

    const handleAnalyze = async () => {
        if (!file || !sessionId) { alert("Paga primero"); return; }
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
                if (res.ok) setAnalysisData(data); else alert(data.error);
                setIsLoading(false);
            };
        } catch (e) { alert("Error"); setIsLoading(false); }
    };

    if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">Cargando experiencia...</div>;

    // [MODIFIED] Logic for unauthenticated users
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

    // Authenticated Dashboard
    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 relative">
            <SideNav
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onLogout={handleLogout}
                userEmail={session.user.email}
            />

            <main className="flex-1 p-4 lg:p-10 mt-16 lg:mt-0 overflow-y-auto">
                <div className="max-w-7xl mx-auto space-y-10">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-200 pb-8">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                {NAV_LABELS[activeTab] || "Dashboard"}
                            </h2>
                            <p className="text-slate-500 text-sm font-medium">Gestiona tu economía con inteligencia artificial.</p>
                        </div>
                        <div className="hidden lg:flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                            <span className="px-4 py-1.5 text-xs text-slate-400 font-bold uppercase tracking-widest border-r border-slate-100">Estado</span>
                            <div className="flex items-center gap-2 px-4 py-1.5">
                                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-xs font-bold text-slate-700">Auditado por IA</span>
                            </div>
                        </div>
                    </div>

                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                        {activeTab === "dashboard" && <OverviewDashboard />}
                        {activeTab === "balance" && <BalanceSheet />}
                        {activeTab === "fixed" && <FixedExpenses />}
                        {activeTab === "variable" && <VariableExpenses />}
                        {activeTab === "income" && <IncomeTracker />}
                        {activeTab === "budget" && <BudgetManager selectedMonth={new Date().toISOString().slice(0, 7)} />}
                        {activeTab === "goals" && <SavingsGoals />}
                        {activeTab === "networth" && <NetWorthChart />}
                        {activeTab === "partner" && <PartnerManager />}
                        {activeTab === "card" && (
                            <CardManager
                                file={file}
                                isPaid={isPaid}
                                isLoading={isLoading}
                                analysisData={analysisData}
                                onFileSelect={handleFileSelect}
                                onPay={handlePay}
                                onAnalyze={handleAnalyze}
                            />
                        )}
                    </div>
                </div>
            </main>
        </div>
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
    networth: "Evolución de Patrimonio",
    partner: "Socios y Pareja"
};
