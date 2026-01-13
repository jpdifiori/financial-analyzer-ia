"use client";

import { useState } from "react";
import { UploadZone } from "@/components/upload-zone";
import { AnalysisDashboard } from "@/components/analysis-dashboard";
import { FinancialEvolution } from "@/components/financial-evolution";
import { CardHistory } from "@/components/card-history";
import { UserCardsList } from "@/components/user-cards-list";
import { PlusCircle, History, TrendingUp, CreditCard, Upload, ChevronLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CardManagerProps {
    file: File | null;
    isPaid: boolean;
    sessionId: string | null;
    isLoading: boolean;
    analysisData: any | null;
    onFileSelect: (file: File | null) => void;
    onPay: () => void;
    onAnalyze: () => void;
}

export function CardManager({
    file,
    isPaid,
    sessionId,
    isLoading,
    analysisData,
    onFileSelect,
    onPay,
    onAnalyze
}: CardManagerProps) {
    const [subTab, setSubTab] = useState<"history" | "evolution" | "my-cards">("history");
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    return (
        <div className="w-full space-y-6 relative">

            {/* Top Bar with Navigation and Action Button */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                {/* Left Side: Navigation / Title Context */}
                <div className="flex items-center gap-3">
                    {subTab !== "history" && (
                        <Button
                            onClick={() => setSubTab("history")}
                            variant="ghost"
                            className="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
                        >
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Volver
                        </Button>
                    )}

                    <div className="flex items-center space-x-2">
                        <Button
                            onClick={() => setSubTab("evolution")}
                            variant={subTab === "evolution" ? "secondary" : "ghost"}
                            className={`flex items-center gap-2 ${subTab === "evolution"
                                ? "bg-slate-800 text-white shadow-sm border border-white/10"
                                : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                        >
                            <TrendingUp className="h-4 w-4" />
                            Evolución
                        </Button>
                        <Button
                            onClick={() => setSubTab("my-cards")}
                            variant={subTab === "my-cards" ? "secondary" : "ghost"}
                            className={`flex items-center gap-2 ${subTab === "my-cards"
                                ? "bg-slate-800 text-white shadow-sm border border-white/10"
                                : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                        >
                            <CreditCard className="h-4 w-4" />
                            Mis Tarjetas
                        </Button>
                    </div>
                </div>

                {/* Upload Button */}
                <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] border border-orange-400/20 rounded-xl px-6">
                            <Upload className="mr-2 h-4 w-4" />
                            Subir Resumen
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl bg-slate-950/95 border-white/10 text-white backdrop-blur-xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-center mb-4">Analizar Nuevo Resumen</DialogTitle>
                        </DialogHeader>

                        {!analysisData ? (
                            <div className="w-full">
                                {isPaid && !file && sessionId !== "bypass-payment" && (
                                    <div className="text-center mb-6 p-4 bg-emerald-500/10 text-emerald-400 rounded-lg max-w-xl mx-auto border border-emerald-500/20">
                                        ¡Pago recibido! Sube tu PDF para analizarlo.
                                    </div>
                                )}
                                <UploadZone
                                    onFileSelect={onFileSelect}
                                    selectedFile={file}
                                    isLoading={isLoading}
                                    onAnalyze={onAnalyze}
                                    onPay={onPay}
                                    isPaid={isPaid}
                                />
                            </div>
                        ) : (
                            <div className="space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
                                <div className="flex justify-between items-center bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20">
                                    <span className="text-emerald-400 font-medium">¡Análisis Completado!</span>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="text-sm underline text-emerald-300 hover:text-emerald-200"
                                    >
                                        Cargar otro archivo
                                    </button>
                                </div>

                                <AnalysisDashboard data={analysisData} />

                                {/* Detailed Expenses Table (Immediate View) */}
                                <div className="bg-slate-900/50 p-6 rounded-lg shadow-sm border border-white/5">
                                    <h3 className="text-lg font-bold mb-4 text-slate-200">Detalle de Gastos Detectados</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-white/5 text-slate-400 font-semibold font-mono uppercase text-xs">
                                                <tr>
                                                    <th className="px-4 py-3 rounded-l-lg">Fecha</th>
                                                    <th className="px-4 py-3">Descripción</th>
                                                    <th className="px-4 py-3">Categoría</th>
                                                    <th className="px-4 py-3 text-right">Monto</th>
                                                    <th className="px-4 py-3 text-center rounded-r-lg">Tipo</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {analysisData.items?.map((item: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                        <td className="px-4 py-3 font-medium text-slate-300 whitespace-nowrap">{item.date}</td>
                                                        <td className="px-4 py-3 text-slate-400">{item.description}</td>
                                                        <td className="px-4 py-3">
                                                            <span className="bg-cyan-500/10 text-cyan-400 text-[10px] uppercase font-bold px-2 py-1 rounded-lg border border-cyan-500/20">
                                                                {item.category || item.suggested_category || "General"}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-white font-mono">
                                                            ${typeof item.amount === 'number' ? item.amount.toLocaleString() : item.amount}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {item.is_fixed ? (
                                                                <span className="bg-purple-500/10 text-purple-400 text-[10px] uppercase px-2 py-1 rounded-lg font-bold border border-purple-500/20">FIJO</span>
                                                            ) : (
                                                                <span className="text-slate-500 text-[10px] uppercase">Variable</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            {/* Content Area */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {subTab === "history" && <CardHistory />}

                {subTab === "evolution" && <FinancialEvolution />}

                {subTab === "my-cards" && <UserCardsList />}
            </div>
        </div>
    );
}
