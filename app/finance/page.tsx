"use client";

import { useState, useEffect, Suspense } from "react";
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
import { Calendar } from "lucide-react";

import { useLanguage } from "@/context/language-context";

function FinanceContent() {
    const { t } = useLanguage();
    const searchParams = useSearchParams();
    const [session, setSession] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);

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

    const [activeTab, setActiveTab] = useState<"dashboard" | "fixed" | "variable" | "card" | "income" | "budget" | "goals" | "partner" | "balance">("dashboard");
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    const [file, setFile] = useState<File | null>(null);
    const [isPaid, setIsPaid] = useState(true); // Payment disabled by default
    const [sessionId, setSessionId] = useState<string | null>("bypass-payment"); // Mock session ID
    const [isLoading, setIsLoading] = useState(false);
    const [analysisData, setAnalysisData] = useState<any | null>(null);

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

    if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">Cargando módulo financiero...</div>;

    if (!session) {
        window.location.href = "/";
        return null;
    }

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 relative font-sans text-slate-100 selection:bg-cyan-500/30">

            {/* Global Aurora Background Strings */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse duration-[8000ms]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[100px] animate-pulse duration-[10000ms]" />
            </div>

            <SideNav
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                userEmail={session.user.email}
            />

            <main className="flex-1 p-4 lg:p-12 mt-16 lg:mt-0 relative z-10">
                <div className="max-w-7xl mx-auto space-y-12">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-4 border-b border-white/5">
                        <div className="space-y-2">
                            <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight italic">
                                {t(`finance.nav.${activeTab}`)}
                            </h2>
                            <p className="text-slate-400 text-sm font-medium italic opacity-70">
                                {t("finance.description")}
                            </p>
                        </div>

                        <div className="flex items-center gap-3 bg-white/5 p-2 rounded-[24px] border border-white/10 shadow-lg backdrop-blur-md">
                            <div className="flex items-center gap-2 px-4 border-r border-white/10">
                                <Calendar className="h-4 w-4 text-cyan-400" />
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="bg-transparent border-none text-white text-sm font-mono font-bold outline-none cursor-pointer focus:ring-0 [&::-webkit-calendar-picker-indicator]:invert"
                                />
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2">
                                <div className="h-1.5 w-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-400">
                                    {t("finance.aiAudited")}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                        {activeTab === "dashboard" && <OverviewDashboard selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />}
                        {activeTab === "balance" && <BalanceSheet />}
                        {activeTab === "fixed" && <FixedExpenses selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />}
                        {activeTab === "variable" && <VariableExpenses selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />}
                        {activeTab === "income" && <IncomeTracker selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />}
                        {activeTab === "budget" && <BudgetManager selectedMonth={selectedMonth} />}
                        {activeTab === "goals" && <SavingsGoals />}
                        {activeTab === "partner" && <PartnerManager />}
                        {activeTab === "card" && (
                            <CardManager
                                file={file}
                                isPaid={isPaid}
                                sessionId={sessionId}
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

export default function FinancePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">Cargando...</div>}>
            <FinanceContent />
        </Suspense>
    );
}
