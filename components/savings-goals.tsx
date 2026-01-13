"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Loader2, Target, Plus, Trash2, CheckCircle2 } from "lucide-react";

export function SavingsGoals() {
    const [loading, setLoading] = useState(true);
    const [goals, setGoals] = useState<any[]>([]);
    const [newGoal, setNewGoal] = useState({ name: "", target: "", date: "" });

    useEffect(() => {
        fetchGoals();
    }, []);

    const fetchGoals = async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from("savings_goals").select("*").order("created_at", { ascending: false });
            setGoals(data || []);
        } catch (error) {
            console.error("Error fetching goals:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddGoal = async () => {
        if (!newGoal.name || !newGoal.target) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase.from("savings_goals").insert({
                user_id: user.id,
                name: newGoal.name,
                target_amount: parseFloat(newGoal.target),
                target_date: newGoal.date || null
            });

            if (error) throw error;
            setNewGoal({ name: "", target: "", date: "" });
            fetchGoals();
        } catch (error) {
            console.error("Error adding goal:", error);
        }
    };

    const handleDeleteGoal = async (id: string) => {
        try {
            await supabase.from("savings_goals").delete().eq("id", id);
            fetchGoals();
        } catch (error) {
            console.error("Error deleting goal:", error);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-cyan-500" /></div>;

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* New Goal Input Card - Aurora UI */}
            <div className="bg-slate-950/50 border border-white/10 rounded-[32px] p-8 lg:p-10 shadow-2xl relative overflow-hidden group backdrop-blur-xl">
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <h3 className="text-3xl font-serif text-cyan-400 italic tracking-tight flex items-center gap-3">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                                Metas de Ahorro
                            </span>
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Nombre</label>
                            <Input
                                placeholder="Ej: Vacaciones"
                                value={newGoal.name}
                                onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:bg-white/10 transition-all font-serif italic h-auto outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Monto Objetivo</label>
                            <Input
                                type="number"
                                placeholder="$"
                                value={newGoal.target}
                                onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono font-bold placeholder:text-slate-500 focus:border-cyan-500/50 focus:bg-white/10 transition-all h-auto outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Fecha Límite</label>
                            <Input
                                type="date"
                                value={newGoal.date}
                                onChange={(e) => setNewGoal({ ...newGoal, date: e.target.value })}
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-slate-300 font-mono font-medium placeholder:text-slate-500 focus:border-cyan-500/50 focus:bg-white/10 transition-all h-auto outline-none"
                            />
                        </div>
                        <Button onClick={handleAddGoal} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl h-auto py-4 shadow-[0_0_20px_rgba(6,182,212,0.4)] w-full transition-transform hover:scale-[1.02] border border-white/10 font-bold uppercase tracking-widest text-xs">
                            <Plus className="h-4 w-4 mr-2" /> Agregar Meta
                        </Button>
                    </div>
                </div>
                {/* Aurora Blobs */}
                <div className="absolute -top-24 -right-24 h-64 w-64 bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none group-hover:bg-cyan-500/30 transition-all duration-700" />
                <div className="absolute -bottom-24 -left-24 h-64 w-64 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none group-hover:bg-blue-600/30 transition-all duration-700" />
            </div>

            {/* Goals Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {goals.map(goal => {
                    const percent = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                    const isAchieved = goal.current_amount >= goal.target_amount;

                    return (
                        <div key={goal.id} className="bg-slate-900/60 rounded-[24px] p-8 shadow-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] hover:bg-slate-800/80 transition-all duration-300 border border-white/5 group relative overflow-hidden backdrop-blur-sm">
                            {isAchieved && <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/20 rounded-bl-[80px] blur-xl" />}

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h4 className="font-serif italic text-xl text-white mb-2 group-hover:text-cyan-300 transition-colors">{goal.name}</h4>
                                        {goal.target_date && (
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-black/20 px-2 py-1 rounded-lg inline-block border border-white/5">
                                                Vence: {new Date(goal.target_date).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteGoal(goal.id)} className="h-8 w-8 p-0 rounded-full hover:bg-rose-500/10 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="space-y-5">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="text-3xl font-mono font-black text-white drop-shadow-md">
                                                ${goal.current_amount.toLocaleString()}
                                            </div>
                                            <p className="text-xs text-slate-400 font-mono mt-1">
                                                de <span className="text-cyan-400 font-bold">${goal.target_amount.toLocaleString()}</span>
                                            </p>
                                        </div>
                                        <div className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider font-mono border ${isAchieved ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"}`}>
                                            {percent.toFixed(0)}%
                                        </div>
                                    </div>

                                    <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-white/10">
                                        <div
                                            style={{ width: `${percent}%` }}
                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${isAchieved ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]"}`}
                                        />
                                    </div>

                                    {isAchieved && (
                                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold animate-in zoom-in duration-300 uppercase tracking-wider">
                                            <CheckCircle2 className="h-4 w-4" /> Meta Alcanzada
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {goals.length === 0 && (
                    <div className="col-span-1 md:col-span-2 bg-slate-900/40 rounded-[24px] p-12 text-center border border-white/5 border-dashed">
                        <p className="text-slate-500 font-mono text-sm uppercase tracking-widest">No tienes metas de ahorro activas.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
