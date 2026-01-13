"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { LIABILITY_TYPES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, CreditCard, Receipt, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { NumberTicker } from "@/components/ui/number-ticker";

export function LiabilityManager() {
    const [loading, setLoading] = useState(true);
    const [liabilities, setLiabilities] = useState<any[]>([]);
    const [cardInstallments, setCardInstallments] = useState<any[]>([]);
    const [newLiability, setNewLiability] = useState({ type: LIABILITY_TYPES[0], customType: "", description: "", amount: "" });


    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Manual Liabilities
            const { data: manual } = await supabase.from("liabilities").select("*").order("created_at", { ascending: false });
            setLiabilities(manual || []);

            // 2. Fetch Card Installments (Future Liabilities) - Client Side Logic
            const { data: allAnalyses } = await supabase
                .from("analyses")
                .select("*")
                .order("created_at", { ascending: false });

            // Filter to keep only the LATEST analysis for each card
            const latestAnalysesMap = new Map();
            allAnalyses?.forEach(a => {
                if (a.card_id && !latestAnalysesMap.has(a.card_id)) {
                    latestAnalysesMap.set(a.card_id, a);
                }
            });

            const uniqueAnalyses = Array.from(latestAnalysesMap.values());
            const futureDebts: any[] = [];

            uniqueAnalyses.forEach((a: any) => {
                const bankName = a.summary?.bank_name || "Tarjeta";

                if (a.installments && Array.isArray(a.installments)) {
                    a.installments.forEach((inst: any) => {
                        const totalOrders = inst.total_installments || 1;
                        const currentOrder = inst.current_installment || 1;

                        // Fix for missing amount key: check installment_amount first
                        const monthlyAmount = inst.installment_amount || inst.amount || 0;

                        // Calculate remaining if missing
                        let remaining = inst.remaining_amount;
                        if (remaining === null || remaining === undefined) {
                            remaining = (totalOrders - currentOrder) * monthlyAmount;
                        }

                        // Skip completed debts (Allow 0 remaining if current < total, but usually 0 means paid)
                        if (currentOrder >= totalOrders || remaining <= 0) {
                            return;
                        }

                        futureDebts.push({
                            id: `card-${a.id}-${inst.description}`,
                            description: inst.description,
                            amount: remaining,
                            type: "Tarjeta de Crédito",
                            isAuto: true,
                            currency: inst.currency || 'ARS',
                            // Detailed formatting required by user
                            details: `${bankName} • Restan $${Number(remaining).toLocaleString()} • Cuota $${Number(monthlyAmount).toLocaleString()} (${currentOrder}/${totalOrders})`
                        });
                    });
                }
                // Fallback Logic (Legacy)
                else if (a.summary?.future_installments) {
                    a.summary.future_installments.forEach((inst: any) => {
                        futureDebts.push({
                            id: `card-${a.id}-${inst.description}`,
                            description: inst.description,
                            amount: inst.amount,
                            type: "Tarjeta de Crédito (Legacy)",
                            isAuto: true
                        });
                    });
                }
            });
            console.log("DEBUG: Final Client-Side Debts:", futureDebts.length);
            setCardInstallments(futureDebts);

        } catch (error) {
            console.error("Error fetching liabilities:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddLiability = async () => {
        if (!newLiability.amount || (!newLiability.description && newLiability.type === "Otros")) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const finalType = newLiability.type === "Otros" && newLiability.customType ? newLiability.customType : newLiability.type;

            const { error } = await supabase.from("liabilities").insert({
                user_id: user.id,
                type: finalType,
                description: newLiability.description || finalType,
                total_amount: parseFloat(newLiability.amount)
            });

            if (error) throw error;
            setNewLiability({ type: LIABILITY_TYPES[0], customType: "", description: "", amount: "" });
            fetchData();
        } catch (error) {
            console.error("Error adding liability:", error);
        }
    };

    const handleDeleteLiability = async (id: string) => {
        try {
            await supabase.from("liabilities").delete().eq("id", id);
            fetchData();
        } catch (error) {
            console.error("Error deleting liability:", error);
        }
    };

    const formatCurrency = (amount: number, currency: string = 'ARS') => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-[#ef4444]" /></div>;

    const totalManual = liabilities.reduce((sum, l) => sum + Number(l.total_amount), 0);
    // Be careful summing mixed currencies, ideally we'd separate them. 
    // For now, we sum them numerically but this is technically incorrect if mixed.
    const totalCards = cardInstallments.reduce((sum, c) => sum + Number(c.amount), 0);
    const grandTotal = totalManual + totalCards;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Main Input Card - Aurora UI */}
            <div className="bg-slate-950/50 border border-white/10 rounded-[32px] p-8 lg:p-10 shadow-2xl relative overflow-hidden group backdrop-blur-xl">
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3 text-rose-400 font-serif italic">
                            <Receipt className="h-6 w-6" /> <span className="text-xl tracking-tight">Tus Pasivos</span>
                        </div>
                        <div className="text-4xl font-mono font-black text-white">
                            <span className="text-lg text-slate-500 font-medium mr-2">Total Est.</span>
                            $<NumberTicker value={grandTotal} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <select
                            value={newLiability.type}
                            onChange={(e) => setNewLiability({ ...newLiability, type: e.target.value })}
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 font-mono outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all cursor-pointer"
                        >
                            {LIABILITY_TYPES.map(t => <option key={t} value={t} className="bg-slate-900 text-slate-200">{t}</option>)}
                        </select>

                        {newLiability.type === "Otros" && (
                            <Input
                                placeholder="¿Qué tipo?"
                                value={newLiability.customType}
                                onChange={(e) => setNewLiability({ ...newLiability, customType: e.target.value })}
                                className="bg-white/5 border border-white/10 rounded-xl h-auto py-3 text-white placeholder:text-slate-500 font-mono focus:border-rose-500/50 focus:bg-white/10 transition-all"
                            />
                        )}

                        <Input
                            placeholder="Descripción (ej: Préstamo UVA)"
                            value={newLiability.description}
                            onChange={(e) => setNewLiability({ ...newLiability, description: e.target.value })}
                            className="bg-white/5 border border-white/10 rounded-xl h-auto py-3 text-white placeholder:text-slate-500 font-serif italic focus:border-rose-500/50 focus:bg-white/10 transition-all"
                        />
                        <Input
                            type="number"
                            placeholder="Monto Total ($)"
                            value={newLiability.amount}
                            onChange={(e) => setNewLiability({ ...newLiability, amount: e.target.value })}
                            className="bg-white/5 border border-white/10 rounded-xl h-auto py-3 text-white placeholder:text-slate-500 font-mono focus:border-rose-500/50 focus:bg-white/10 transition-all"
                        />
                        <Button
                            onClick={handleAddLiability}
                            className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] border border-rose-500/20 rounded-xl py-6 font-mono font-bold uppercase tracking-widest text-[10px]"
                        >
                            <Plus className="h-4 w-4 mr-2" /> AGREGAR
                        </Button>
                    </div>
                </div>
                {/* Aurora Blob */}
                <div className="absolute -top-24 -right-24 h-64 w-64 bg-rose-500/20 rounded-full blur-[100px] pointer-events-none group-hover:bg-rose-500/30 transition-all duration-700" />
            </div>



            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liabilities.map(l => (
                    <div key={l.id} className="bg-slate-900/60 border border-white/10 rounded-[24px] p-6 hover:bg-slate-800/80 hover:border-white/20 shadow-lg transition-all group relative overflow-hidden backdrop-blur-md">
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(225,29,72,0.5)] transition-all">
                                    <AlertCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-serif text-white font-bold text-lg tracking-wide">{l.description}</h4>
                                    <p className="text-[11px] font-mono text-slate-300 uppercase tracking-widest font-semibold">{l.type}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-xl font-mono text-white font-black tracking-tight drop-shadow-md">${Number(l.total_amount).toLocaleString('es-AR')}</div>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteLiability(l.id)} className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-400 hover:bg-rose-500/10">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}

                {cardInstallments.map(c => (
                    <div key={c.id} className="bg-slate-900/50 border border-white/10 rounded-[24px] p-6 opacity-90 hover:opacity-100 transition-all group relative overflow-hidden backdrop-blur-md hover:bg-slate-800/60 hover:border-white/20">
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-300 group-hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all">
                                    <CreditCard className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-serif text-white font-bold text-lg tracking-wide">{c.description}</h4>
                                    <p className="text-[11px] font-mono text-orange-300 font-bold uppercase tracking-widest">{c.details || "Auto • Cuotas"}</p>
                                </div>
                            </div>
                            <div className="text-xl font-mono text-white font-black tracking-tight drop-shadow-md">${c.amount.toLocaleString('es-AR')}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
