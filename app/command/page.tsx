"use client";

import React from "react";
import { Inbox, Target, Zap, Users, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

// Component placeholders
import { InboxView } from "@/components/command/inbox-view";
import { ActionsView } from "@/components/command/actions-view";
import { MissionsView } from "@/components/command/missions-view";

type ViewState = "inbox" | "actions" | "missions" | "delegate";

export default function CommandPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // Get view from URL or default to 'inbox'
    const view = (searchParams.get("tab") as ViewState) || "inbox";

    const setView = (newView: ViewState) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", newView);
        // Use replace to prevent history stack buildup, but scroll: false to keep position
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const renderView = () => {
        switch (view) {
            case "inbox":
                return <InboxView />;
            case "actions":
                return <ActionsView />;
            case "missions":
                return <MissionsView />;
            case "delegate":
                return (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <Search className="h-12 w-12 mb-4 opacity-50" />
                        <p>No se encontraron detalles agregados (Delegar WIP)</p>
                    </div>
                );
            default:
                return <InboxView />;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Command</h1>
                <p className="text-slate-400 max-w-2xl mx-auto text-sm leading-relaxed">
                    Tu mente es para tener ideas, no para almacenarlas. Vuelca todo el ruido aquí.
                    Prioriza tus misiones críticas, ejecuta con foco y siente el poder de una mente despejada.
                </p>
            </div>

            {/* Navigation / Actions */}
            <div className="flex flex-col items-center gap-6">
                <button
                    onClick={() => setView("inbox")}
                    className={cn(
                        "flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/20",
                        view === "inbox"
                            ? "bg-orange-600 text-white ring-2 ring-orange-400 ring-offset-2 ring-offset-slate-950"
                            : "bg-orange-600 text-white hover:bg-orange-500"
                    )}
                >
                    <Inbox className="h-5 w-5" />
                    <span>Inbox</span>
                </button>

                <div className="flex items-center p-1 bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/5">
                    <button
                        onClick={() => setView("actions")}
                        className={cn(
                            "px-6 py-2 rounded-lg text-sm font-semibold transition-all",
                            view === "actions"
                                ? "bg-slate-800 text-white shadow-md ring-1 ring-white/10"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            Accionar
                        </div>
                    </button>
                    <button
                        onClick={() => setView("missions")}
                        className={cn(
                            "px-6 py-2 rounded-lg text-sm font-semibold transition-all",
                            view === "missions"
                                ? "bg-slate-800 text-white shadow-md ring-1 ring-white/10"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Misiones
                        </div>
                    </button>
                    <button
                        onClick={() => setView("delegate")}
                        className={cn(
                            "px-6 py-2 rounded-lg text-sm font-semibold transition-only",
                            view === "delegate"
                                ? "bg-slate-800 text-white shadow-md ring-1 ring-white/10"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Delegar
                        </div>
                    </button>
                </div>
            </div>

            {/* View Content */}
            <div className="min-h-[400px] border-t border-white/5 pt-8">
                {renderView()}
            </div>
        </div>
    );
}
