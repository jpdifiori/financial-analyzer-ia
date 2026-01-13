"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ASSET_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, Wallet, Building2, Banknote, Coins } from "lucide-react";
import { NumberTicker } from "@/components/ui/number-ticker";
import { cn } from "@/lib/utils";

export function AssetManager() {
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState<any[]>([]);
    const [newAsset, setNewAsset] = useState({
        type: ASSET_TYPES[0],
        customType: "",
        description: "",
        amount: "",
        currency: "ARS" // Default currency
    });

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from("assets").select("*").order("created_at", { ascending: false });
            setAssets(data || []);
        } catch (error) {
            console.error("Error fetching assets:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAsset = async () => {
        if (!newAsset.amount || (!newAsset.description && newAsset.type === "Otros")) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const finalType = newAsset.type === "Otros" && newAsset.customType ? newAsset.customType : newAsset.type;

            const { error } = await supabase.from("assets").insert({
                user_id: user.id,
                type: finalType,
                description: newAsset.description || finalType,
                amount: parseFloat(newAsset.amount),
                currency: newAsset.currency
            });

            if (error) throw error;
            setNewAsset({ type: ASSET_TYPES[0], customType: "", description: "", amount: "", currency: "ARS" });
            fetchAssets();
        } catch (error) {
            console.error("Error adding asset:", error);
        }
    };

    const handleDeleteAsset = async (id: string) => {
        try {
            await supabase.from("assets").delete().eq("id", id);
            fetchAssets();
        } catch (error) {
            console.error("Error deleting asset:", error);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-cyan-400" /></div>;

    // Calculate total converted to ARS (mock conversion for display if needed, or just separate totals)
    // For now, valid strategy is showing separate totals or just raw sum if 1:1 isn't possible dynamically.
    // Let's summing raw numbers is risky, but for "Total Assets" we might need a unified view. 
    // Given no exchange rate API, we'll display the main total in base currency or just separate.
    // User asked to "Load Assets" with Currency. Let's just sum them visually separated or assuming user handles mental math.
    // Actually, usually one Total is expected. Let's assume 1 USD = 1000 ARS for rough estimate OR better: differentiate in list.
    // Let's stick to summing them as is (dangerous) or separate.
    // *Better approach*: Just show total as "Estimated Value (ARS)" and maybe ignore USD conversion complexity for now, 
    // OR just show a list.
    // Let's try to show separate totals if possible, or just the main ticker sum (which might be mixed).
    // *Decision*: Display Total in ARS (assuming simple sum) but show currency in list.
    // *Refined*: Let's show separate totals for ARS and USD.

    const totalArs = assets.filter(a => a.currency === 'ARS' || !a.currency).reduce((sum, a) => sum + Number(a.amount), 0);
    const totalUsd = assets.filter(a => a.currency === 'USD').reduce((sum, a) => sum + Number(a.amount), 0);

    return (
        <div className="space-y-8">
            {/* Input Card - Aurora Glass */}
            <div className="bg-slate-950/50 border border-white/10 rounded-[32px] p-8 lg:p-10 shadow-2xl relative overflow-hidden group backdrop-blur-xl">
                {/* ... (existing content logic) ... */}
                {/* I will truncate existing content matching since I am targeting line 186 to append AFTER the closing div of Input Card */}
                {/* Actually, the closing div is at line 185. Ideally I should target the closing of the input card div */}
                {/* Re-reading line numbers: line 185 is closing div of input card. */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                <div className="absolute -top-24 -right-24 h-64 w-64 bg-cyan-500/20 rounded-full blur-[80px] pointer-events-none animate-pulse" />

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6">
                        <div className="flex items-center gap-3 text-cyan-400">
                            <Building2 className="h-6 w-6" />
                            <span className="text-xl font-bold tracking-tight text-slate-200">Tus Activos</span>
                        </div>

                        <div className="flex gap-6 text-right">
                            <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total ARS</p>
                                <div className="text-3xl font-black text-white tracking-tight">
                                    $<NumberTicker value={totalArs} />
                                </div>
                            </div>
                            {totalUsd > 0 && (
                                <div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total USD</p>
                                    <div className="text-3xl font-black text-emerald-400 tracking-tight">
                                        u$d <NumberTicker value={totalUsd} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                        <div className="lg:col-span-3">
                            <select
                                value={newAsset.type}
                                onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value })}
                                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 font-medium outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all cursor-pointer appearance-none"
                            >
                                {ASSET_TYPES.map(t => <option key={t} value={t} className="bg-slate-950 text-slate-300">{t}</option>)}
                            </select>
                        </div>

                        {/* Currency Selector */}
                        <div className="lg:col-span-2">
                            <select
                                value={newAsset.currency}
                                onChange={(e) => setNewAsset({ ...newAsset, currency: e.target.value })}
                                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 font-bold outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all cursor-pointer appearance-none text-center"
                            >
                                <option value="ARS" className="bg-slate-950">ARS ($)</option>
                                <option value="USD" className="bg-slate-950">USD (u$d)</option>
                            </select>
                        </div>

                        {newAsset.type === "Otros" && (
                            <div className="lg:col-span-2">
                                <Input
                                    placeholder="¿Qué tipo?"
                                    value={newAsset.customType}
                                    onChange={(e) => setNewAsset({ ...newAsset, customType: e.target.value })}
                                    className="bg-slate-900/80 border border-white/10 text-slate-200 placeholder:text-slate-500"
                                />
                            </div>
                        )}

                        <div className={newAsset.type === "Otros" ? "lg:col-span-2" : "lg:col-span-4"}>
                            <Input
                                placeholder="Descripción (ej: Cuenta Sueldo)"
                                value={newAsset.description}
                                onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                                className="bg-slate-900/80 border border-white/10 text-slate-200 placeholder:text-slate-500"
                            />
                        </div>

                        <div className="lg:col-span-2 relative">
                            <Input
                                type="number"
                                placeholder="Monto"
                                value={newAsset.amount}
                                onChange={(e) => setNewAsset({ ...newAsset, amount: e.target.value })}
                                className="bg-slate-900/80 border border-white/10 text-slate-200 placeholder:text-slate-500 pl-8"
                            />
                            <span className="absolute left-3 top-3 text-slate-500 text-xs font-bold">
                                {newAsset.currency === 'USD' ? 'u$d' : '$'}
                            </span>
                        </div>

                        <div className="lg:col-span-1">
                            <Button onClick={handleAddAsset} className="w-full h-full bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-500/50 rounded-xl shadow-[0_0_15px_rgba(8,145,178,0.3)]">
                                <Plus className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>



            {/* Assets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assets.map(asset => {
                    const isUsd = asset.currency === 'USD';
                    return (
                        <div key={asset.id} className="bg-slate-900/40 border border-white/5 rounded-[24px] p-6 hover:bg-slate-800/40 hover:border-white/10 transition-all group relative overflow-hidden backdrop-blur-sm">
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-lg",
                                        isUsd ? "bg-emerald-500/10 text-emerald-400 shadow-emerald-500/10" : "bg-cyan-500/10 text-cyan-400 shadow-cyan-500/10"
                                    )}>
                                        {isUsd ? <Banknote className="h-6 w-6" /> : <Coins className="h-6 w-6" />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-200 group-hover:text-white transition-colors">{asset.description}</h4>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{asset.type}</p>
                                            {isUsd && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">USD</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className={cn("text-xl font-black tracking-tight", isUsd ? "text-emerald-400" : "text-white")}>
                                        {isUsd ? 'u$d' : '$'}{Number(asset.amount).toLocaleString()}
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteAsset(asset.id)} className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-rose-400 hover:bg-rose-500/10">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
