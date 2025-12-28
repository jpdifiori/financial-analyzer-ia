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

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-orange-500" /></div>;

    return (
        <div className="space-y-6">
            <Card className="border-orange-100 bg-orange-50/30">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="h-5 w-5 text-orange-600" /> Nueva Meta de Ahorro
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Input
                            placeholder="Nombre (ej: Vacaciones)"
                            value={newGoal.name}
                            onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                        />
                        <Input
                            type="number"
                            placeholder="Monto Objetivo ($)"
                            value={newGoal.target}
                            onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                        />
                        <Input
                            type="date"
                            value={newGoal.date}
                            onChange={(e) => setNewGoal({ ...newGoal, date: e.target.value })}
                        />
                        <Button onClick={handleAddGoal} className="bg-orange-600 hover:bg-orange-700">
                            <Plus className="h-4 w-4 mr-2" /> Agregar Meta
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.map(goal => {
                    const percent = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                    const isAchieved = goal.current_amount >= goal.target_amount;

                    return (
                        <Card key={goal.id} className="border-slate-200 hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex justify-between items-center text-slate-700">
                                    <span>{goal.name}</span>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteGoal(goal.id)}>
                                        <Trash2 className="h-4 w-4 text-slate-300 hover:text-red-500" />
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-2xl font-bold text-slate-900">
                                            ${goal.current_amount.toLocaleString()}
                                            <span className="text-sm font-normal text-slate-400"> / ${goal.target_amount.toLocaleString()}</span>
                                        </div>
                                        {goal.target_date && (
                                            <p className="text-xs text-slate-400">Objetivo: {new Date(goal.target_date).toLocaleDateString()}</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${isAchieved ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
                                            {percent.toFixed(0)}%
                                        </span>
                                    </div>
                                </div>

                                <Progress value={percent} className={`h-2 ${isAchieved ? "bg-emerald-100 [&>div]:bg-emerald-500" : "bg-orange-100 [&>div]:bg-orange-500"}`} />

                                {isAchieved && (
                                    <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
                                        <CheckCircle2 className="h-4 w-4" /> Meta Alcanzada
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
