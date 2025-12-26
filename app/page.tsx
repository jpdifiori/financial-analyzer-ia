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

import { OverviewDashboard } from "@/components/overview-dashboard";
import { CardManager } from "@/components/card-manager";
import { LandingPage } from "@/components/landing-page"; // [NEW]

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

    const [activeTab, setActiveTab] = useState<"dashboard" | "fixed" | "variable" | "card" | "income">("dashboard");

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
        <div className="flex flex-col items-center min-h-[80vh] gap-8 pb-12 relative animate-in fade-in">
            <div className="absolute top-4 right-4 flex items-center gap-4">
                <span className="text-xs text-gray-400">{session.user.email}</span>
                <button onClick={handleLogout} className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline">
                    Cerrar Sesión
                </button>
            </div>

            <div className="text-center space-y-4 max-w-2xl pt-10">
                <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary pb-2">
                    Analizador Financiero IA
                </h1>
                <p className="text-xl text-gray-500">
                    Tu situación financiera, simplificada.
                </p>
            </div>

            {/* 5 Tabs Navigation */}
            <div className="flex p-1 bg-gray-100 rounded-lg overflow-x-auto max-w-full">
                <button
                    onClick={() => setActiveTab("dashboard")}
                    className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all ${activeTab === "dashboard" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                    Resumen
                </button>
                <button
                    onClick={() => setActiveTab("fixed")}
                    className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all ${activeTab === "fixed" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                    Fijos
                </button>
                <button
                    onClick={() => setActiveTab("variable")}
                    className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all ${activeTab === "variable" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                    Variables
                </button>
                <button
                    onClick={() => setActiveTab("card")}
                    className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all ${activeTab === "card" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                    Tarjeta (PDF)
                </button>
                <button
                    onClick={() => setActiveTab("income")}
                    className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all ${activeTab === "income" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                    Ingresos
                </button>
                <a
                    href="/audit"
                    className="px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap transition-all text-orange-600 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-1"
                >
                    <span className="text-lg">🛡️</span> Auditoría
                </a>
                <a
                    href="/coach"
                    className="px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap transition-all text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-1"
                >
                    <span className="text-lg">🧠</span> Coach IA
                </a>
            </div>

            <div className="w-full max-w-6xl px-4">
                {activeTab === "dashboard" && <OverviewDashboard />}
                {activeTab === "fixed" && <FixedExpenses />}
                {activeTab === "variable" && <VariableExpenses />}
                {activeTab === "income" && <IncomeTracker />}
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
    );
}
