"use client";

import { useState } from "react";
import { AssetManager } from "./asset-manager";
import { LiabilityManager } from "./liability-manager";
import { Building2, Receipt } from "lucide-react";

export function BalanceSheet() {
    const [activeTab, setActiveTab] = useState<"assets" | "liabilities">("assets");

    return (
        <div className="space-y-8 animate-in fade-in duration-1000">
            <div className="text-center max-w-2xl mx-auto space-y-4">
                <h2 className="text-4xl md:text-5xl font-serif text-white tracking-tighter italic">
                    Tu Balance de Poder
                </h2>
                <p className="text-slate-200 text-base font-medium italic">
                    Gestiona tu patrimonio neto real. Registra tus activos (lo que posees) y tus pasivos (tus deudas) con precisión técnica.
                </p>
            </div>

            <div className="w-full">
                {/* Custom Toggle Buttons - Separated Orange Style */}
                <div className="flex justify-center gap-6 mb-12">
                    <button
                        onClick={() => setActiveTab("assets")}
                        className={`flex items-center px-8 py-4 rounded-[24px] font-mono text-xs font-black uppercase tracking-widest transition-all border ${activeTab === "assets"
                            ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.4)] scale-105"
                            : "bg-slate-950/50 border-white/10 text-slate-400 hover:text-orange-400 hover:border-orange-500/50 hover:bg-white/5"
                            }`}
                    >
                        <Building2 className="h-4 w-4 mr-2" /> Activos
                    </button>
                    <button
                        onClick={() => setActiveTab("liabilities")}
                        className={`flex items-center px-8 py-4 rounded-[24px] font-mono text-xs font-black uppercase tracking-widest transition-all border ${activeTab === "liabilities"
                            ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.4)] scale-105"
                            : "bg-slate-950/50 border-white/10 text-slate-400 hover:text-orange-400 hover:border-orange-500/50 hover:bg-white/5"
                            }`}
                    >
                        <Receipt className="h-4 w-4 mr-2" /> Pasivos
                    </button>
                </div>

                {/* Content Area */}
                <div className="mt-0">
                    {activeTab === "assets" && <AssetManager />}
                    {activeTab === "liabilities" && <LiabilityManager />}
                </div>
            </div>
        </div>
    );
}
