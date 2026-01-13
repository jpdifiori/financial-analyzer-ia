"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface UploadZoneProps {
    onFileSelect: (file: File) => void;
    selectedFile: File | null;
    isLoading: boolean;
    onAnalyze: () => void;
    onPay: () => void;
    isPaid: boolean;
}

export function UploadZone({
    onFileSelect,
    selectedFile,
    isLoading,
    onAnalyze,
    onPay,
    isPaid
}: UploadZoneProps) {

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0 && files[0].type === "application/pdf") {
            onFileSelect(files[0]);
        } else if (files && files.length > 0) {
            toast.error("Solo archivos PDF.");
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-center">Sube tu Resumen</h2>

            {!selectedFile ? (
                <div className="flex flex-col items-center gap-4 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition">
                    <p className="text-gray-500">Selecciona tu archivo PDF</p>
                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileInput}
                        className="block w-full text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-violet-50 file:text-violet-700
                        hover:file:bg-violet-100
                        ml-20"
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="p-4 bg-green-50 text-green-700 rounded-lg flex justify-between items-center">
                        <span className="font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => onFileSelect(null as any)}>Cambiar</Button>
                    </div>

                    {!isPaid ? (
                        <Button
                            onClick={onPay}
                            className="w-full text-lg bg-slate-900 hover:bg-slate-800 text-white h-12 flex items-center justify-center gap-2"
                        >
                            Desbloquear Auditoría Completa ($2.99)
                        </Button>
                    ) : (
                        <>
                            <Button
                                onClick={onAnalyze}
                                className="w-full text-lg bg-blue-600 hover:bg-blue-700 text-white h-12"
                                disabled={isLoading}
                            >
                                {isLoading ? "Procesando con IA..." : "Analizar Gastos"}
                            </Button>

                            {isLoading && (
                                <div className="text-center text-sm text-blue-600 animate-pulse">
                                    Conectando con Gemini Flash...
                                </div>
                            )}
                        </>
                    )}

                    {!isPaid && (
                        <p className="text-xs text-center text-gray-400">
                            Pago único y seguro vía Stripe. No guardamos tus datos.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
