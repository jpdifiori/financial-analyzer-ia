"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle2, Save } from "lucide-react";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

export function BudgetManager({ selectedMonth }: { selectedMonth: string }) {
    const [loading, setLoading] = useState(true);
    const [budgets, setBudgets] = useState<Record<string, number>>({});
    const [spending, setSpending] = useState<Record<string, number>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, [selectedMonth]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Budgets
            const { data: budgetData } = await supabase
                .from("budgets")
                .select("category, amount")
                .eq("user_id", user.id)
                .eq("period", selectedMonth);

            const budgetMap: Record<string, number> = {};
            budgetData?.forEach(b => budgetMap[b.category] = b.amount);
            setBudgets(budgetMap);

            // 2. Fetch Spending (Variable, Fixed, Cards)
            const [
                { data: fixedExp },
                { data: variableExp },
                { data: analyses }
            ] = await Promise.all([
                supabase.from("fixed_expenses").select("*").eq("user_id", user.id),
                supabase.from("variable_expenses").select("*").eq("user_id", user.id).gte("date", `${selectedMonth}-01`).lte("date", `${selectedMonth}-31`),
                supabase.from("analyses").select("*").eq("user_id", user.id).eq("summary->>period", selectedMonth)
            ]);

            const spendMap: Record<string, number> = {};

            // Add Fixed
            fixedExp?.forEach(f => {
                const cat = f.category || "Otros";
                spendMap[cat] = (spendMap[cat] || 0) + Number(f.amount);
            });

            // Add Variable
            variableExp?.forEach(v => {
                const cat = v.category || "Otros";
                spendMap[cat] = (spendMap[cat] || 0) + Number(v.amount);
            });

            // Add Card Analyses
            analyses?.forEach(a => {
                Object.entries(a.summary?.categories || {}).forEach(([cat, val]) => {
                    spendMap[cat] = (spendMap[cat] || 0) + Number(val);
                });
            });

            setSpending(spendMap);
        } catch (error) {
            console.error("Error fetching budget data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveBudget = async (category: string, amount: number) => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from("budgets")
                .upsert({
                    user_id: user.id,
                    category,
                    amount,
                    period: selectedMonth
                }, { onConflict: 'user_id,category,period' });

            if (error) throw error;
            setBudgets({ ...budgets, [category]: amount });
        } catch (error) {
            console.error("Error saving budget:", error);
            alert("Error al guardar presupuesto");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-orange-500" /></div>;

    const exceededCategories = Object.entries(spending).filter(([cat, amount]) => {
        const budget = budgets[cat] || 0;
        return budget > 0 && amount > budget;
    });

    return (
        <div className="space-y-6">
            {/* Notifications / Alerts */}
            {exceededCategories.length > 0 && (
                <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Presupuesto Excedido</AlertTitle>
                    <AlertDescription>
                        Te has pasado del límite en: {exceededCategories.map(([cat]) => cat).join(", ")}.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {EXPENSE_CATEGORIES.map(category => {
                    const spent = spending[category] || 0;
                    const budget = budgets[category] || 0;
                    const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
                    const diff = budget - spent;
                    const isOver = budget > 0 && spent > budget;

                    return (
                        <Card key={category} className="border-slate-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold flex justify-between items-center">
                                    <span>{category}</span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            placeholder="Set Budget"
                                            defaultValue={budget || ""}
                                            onBlur={(e) => handleSaveBudget(category, parseFloat(e.target.value) || 0)}
                                            className="w-24 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-500 outline-none"
                                        />
                                        <Save className="h-3 w-3 text-slate-400" />
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-slate-500">Gastado: ${spent.toLocaleString()}</span>
                                    <span className={isOver ? "text-red-600 font-bold" : "text-slate-500"}>
                                        {budget > 0 ? (isOver ? `Exceso: $${Math.abs(diff).toLocaleString()}` : `Disponible: $${diff.toLocaleString()}`) : "Sin Presupuesto"}
                                    </span>
                                </div>
                                <Progress value={percent} className={`h-2 ${isOver ? "bg-red-100 [&>div]:bg-red-500" : "bg-slate-100 [&>div]:bg-orange-500"}`} />
                                {budget > 0 && (
                                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold">
                                        {isOver ? (
                                            <span className="text-red-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Peligro</span>
                                        ) : (
                                            <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Bajo Control</span>
                                        )}
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
