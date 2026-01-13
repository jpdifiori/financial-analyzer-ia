"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, TrendingUp, ShieldCheck, AlertTriangle } from "lucide-react";
import { BatchUpload } from "@/components/batch-upload";
import { AuditDashboard } from "@/components/audit-dashboard";
import { toast } from "sonner";

export default function AuditPage() {
    const [cards, setCards] = useState<any[]>([]);
    const [selectedCard, setSelectedCard] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [auditResult, setAuditResult] = useState<any>(null); // Store result
    const [errorTrace, setErrorTrace] = useState<string | null>(null); // Error Trace

    useEffect(() => {
        fetchCards();
    }, []);

    const fetchCards = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // Handle auth redirect usually
        const { data } = await supabase.from("credit_cards").select("*").eq("user_id", user.id);
        setCards(data || []);
        if (data && data.length > 0) setSelectedCard(data[0].id);
        setLoading(false);
    };

    const handleBatchAudit = async (files: { file: File, base64: string }[]) => {
        if (!selectedCard) {
            toast.error("Seleccioná una tarjeta primero.");
            return;
        }

        setAnalyzing(true);
        setErrorTrace(null);
        try {
            // 1. Process Files via API
            // Note: In a real app we might upload to storage first, but here we send base64 batch to API
            // We might hit payload limits, so realistically we might loop or use a more robust backend.
            // For MVP: We send the batch to a new endpoint `/api/audit-report`

            const res = await fetch("/api/audit-report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    files: files.map(f => f.base64),
                    cardId: selectedCard
                })
            });

            const data = await res.json();

            if (!res.ok) {
                // Throw error with server message if available
                throw new Error(data.error || `Server Error: ${res.statusText}`);
            }

            if (!data.report) {
                throw new Error("La API no devolvió un reporte válido.");
            }

            setAuditResult(data.report); // Full AI Report

        } catch (error: any) {
            console.error(error);
            // Capture full trace
            const trace = error.stack || error.message || JSON.stringify(error);
            setErrorTrace(`Ocurrió un error al procesar la auditoría.\n\nDetalle técnico:\n${trace}`);
        } finally {
            setAnalyzing(false);
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-slate-400" /></div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-8 animate-in fade-in">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="h-8 w-8 text-orange-600" /> Auditoría de Tarjetas
                </h1>
                <p className="text-slate-500 text-lg">
                    Analizá 6 a 12 meses de historia para detectar deudas ocultas, intereses abusivos y oportunidades de ahorro.
                </p>
            </div>

            {/* ERROR TRACE UI */}
            {errorTrace && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 text-sm text-red-900">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <div className="space-y-2 w-full">
                        <p className="font-bold">Error de Auditoría</p>
                        <pre className="whitespace-pre-wrap font-mono text-xs bg-red-100 p-2 rounded border border-red-200 overflow-x-auto">
                            {errorTrace}
                        </pre>
                        <button
                            onClick={() => setErrorTrace(null)}
                            className="text-red-700 hover:text-red-900 underline font-medium"
                        >
                            Cerrar error
                        </button>
                    </div>
                </div>
            )}

            {!auditResult ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Setup Column */}
                    <div className="md:col-span-1 space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>1. Elegí la Tarjeta</CardTitle>
                                <CardDescription>¿Qué tarjeta querés auditar?</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <select
                                    className="w-full p-2 border rounded-lg bg-slate-50 font-medium"
                                    value={selectedCard}
                                    onChange={(e) => setSelectedCard(e.target.value)}
                                >
                                    {cards.length === 0 && <option>No tenés tarjetas creadas</option>}
                                    {cards.map(c => (
                                        <option key={c.id} value={c.id}>{c.bank_name} - {c.last_4}</option>
                                    ))}
                                </select>
                            </CardContent>
                        </Card>

                        <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 border border-blue-100">
                            <strong>💡 Tip:</strong> Subí todos los resúmenes que tengas (PDF o Fotos). Mientras más meses, mejor será la estrategia de desendeudamiento.
                        </div>
                    </div>

                    {/* Upload Column */}
                    <div className="md:col-span-2">
                        <Card className="h-full border-dashed border-2 shadow-none border-slate-200">
                            <CardHeader>
                                <CardTitle>2. Subí los Resúmenes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BatchUpload
                                    onUploadComplete={handleBatchAudit}
                                    isUploading={analyzing}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                /* RESULTS VIEW (Placeholder) */
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800">Resultados del Análisis</h2>
                        <button
                            onClick={() => setAuditResult(null)}
                            className="bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
                        >
                            Nuevo Análisis
                        </button>
                    </div>
                    <AuditDashboard report={auditResult} />
                </div>
            )}
        </div>
    );
}
