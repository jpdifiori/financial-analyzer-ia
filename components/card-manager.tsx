"use client";

import { useState } from "react";
import { UploadZone } from "@/components/upload-zone";
import { AnalysisDashboard } from "@/components/analysis-dashboard";
import { FinancialEvolution } from "@/components/financial-evolution";
import { CardHistory } from "@/components/card-history";
import { UserCardsList } from "@/components/user-cards-list";
import { PlusCircle, History, TrendingUp, CreditCard } from "lucide-react";

interface CardManagerProps {
    file: File | null;
    isPaid: boolean;
    isLoading: boolean;
    analysisData: any | null;
    onFileSelect: (file: File | null) => void;
    onPay: () => void;
    onAnalyze: () => void;
}

export function CardManager({
    file,
    isPaid,
    isLoading,
    analysisData,
    onFileSelect,
    onPay,
    onAnalyze
}: CardManagerProps) {
    const [subTab, setSubTab] = useState<"analyze" | "history" | "evolution" | "my-cards">("analyze");

    return (
        <div className="w-full space-y-6">
            {/* Sub-tabs Navigation */}
            <div className="flex items-center justify-center space-x-2 bg-white p-1 rounded-lg border border-gray-200 w-fit mx-auto shadow-sm flex-wrap gap-y-2">
                <button
                    onClick={() => setSubTab("analyze")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${subTab === "analyze"
                        ? "bg-gray-100 text-orange-600 shadow-sm font-bold"
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                        }`}
                >
                    <PlusCircle className="h-4 w-4" />
                    Nueva Carga
                </button>
                <button
                    onClick={() => setSubTab("history")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${subTab === "history"
                        ? "bg-gray-100 text-orange-600 shadow-sm font-bold"
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                        }`}
                >
                    <History className="h-4 w-4" />
                    Historial
                </button>
                <button
                    onClick={() => setSubTab("evolution")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${subTab === "evolution"
                        ? "bg-gray-100 text-orange-600 shadow-sm font-bold"
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                        }`}
                >
                    <TrendingUp className="h-4 w-4" />
                    Evolución
                </button>
                <button
                    onClick={() => setSubTab("my-cards")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${subTab === "my-cards"
                        ? "bg-gray-100 text-orange-600 shadow-sm font-bold"
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                        }`}
                >
                    <CreditCard className="h-4 w-4" />
                    Mis Tarjetas
                </button>
            </div>

            {/* Content Area */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {subTab === "analyze" && (
                    !analysisData ? (
                        <div className="w-full">
                            {isPaid && !file && (
                                <div className="text-center mb-6 p-4 bg-green-50 text-green-700 rounded-lg max-w-xl mx-auto border border-green-200">
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
                        <div className="space-y-8">
                            <div className="flex justify-between items-center bg-green-50 p-4 rounded-lg border border-green-100">
                                <span className="text-green-700 font-medium">¡Análisis Completado!</span>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="text-sm underline text-green-800 hover:text-green-900"
                                >
                                    Cargar otro archivo
                                </button>
                            </div>
                            <AnalysisDashboard data={analysisData} />

                            {/* Detailed Expenses Table (Immediate View) */}
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold mb-4">Detalle de Gastos Detectados</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-700 font-semibold">
                                            <tr>
                                                <th className="px-4 py-2">Fecha</th>
                                                <th className="px-4 py-2">Descripción</th>
                                                <th className="px-4 py-2">Categoría</th>
                                                <th className="px-4 py-2 text-right">Monto</th>
                                                <th className="px-4 py-2 text-center">Tipo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {analysisData.items?.map((item: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">{item.date}</td>
                                                    <td className="px-4 py-2 text-gray-600">{item.description}</td>
                                                    <td className="px-4 py-2">
                                                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                                                            {item.category || item.suggested_category || "General"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 text-right font-bold text-gray-900">
                                                        ${typeof item.amount === 'number' ? item.amount.toLocaleString() : item.amount}
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        {item.is_fixed ? (
                                                            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-md font-bold">FIJO</span>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">Variable</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )
                )}

                {subTab === "history" && <CardHistory />}

                {subTab === "evolution" && <FinancialEvolution />}

                {subTab === "my-cards" && <UserCardsList />}
            </div>
        </div>
    );
}

// Fix typo in state variable name used in render
const subSubTab = "analyze"; // This line is just a placeholder to avoid linter errors in this snippet, the actual variable in component is subTab
