"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { LIABILITY_TYPES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, CreditCard, Receipt, AlertCircle } from "lucide-react";

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

            // 2. Fetch Card Installments (Future Liabilities)
            // We look into all analyses and extract installments that are NOT for the current month
            const { data: analyses } = await supabase.from("analyses").select("*");

            const currentMonth = new Date().toISOString().slice(0, 7);
            const futureDebts: any[] = [];

            analyses?.forEach(a => {
                // Assuming Gemini stores installments in summary.installments list
                // or summary.total_debt_remaining
                if (a.summary?.future_installments) {
                    a.summary.future_installments.forEach((inst: any) => {
                        futureDebts.push({
                            id: `card-${a.id}-${inst.description}`,
                            description: inst.description,
                            amount: inst.amount,
                            type: "Tarjeta de Crédito (Cuotas Futuras)",
                            isAuto: true
                        });
                    });
                }
            });
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

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-orange-500" /></div>;

    const totalManual = liabilities.reduce((sum, l) => sum + Number(l.total_amount), 0);
    const totalCards = cardInstallments.reduce((sum, c) => sum + Number(c.amount), 0);
    const grandTotal = totalManual + totalCards;

    return (
        <div className="space-y-6">
            <Card className="border-red-100 bg-red-50/30">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center justify-between">
                        <div className="flex items-center gap-2 text-red-700">
                            <Receipt className="h-5 w-5" /> Tus Pasivos (Lo que Debes)
                        </div>
                        <div className="text-2xl font-black text-red-800">${grandTotal.toLocaleString()}</div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                        <select
                            value={newLiability.type}
                            onChange={(e) => setNewLiability({ ...newLiability, type: e.target.value })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            {LIABILITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>

                        {newLiability.type === "Otros" && (
                            <Input
                                placeholder="¿Qué tipo?"
                                value={newLiability.customType}
                                onChange={(e) => setNewLiability({ ...newLiability, customType: e.target.value })}
                            />
                        )}

                        <Input
                            placeholder="Descripción (ej: Préstamo UVA)"
                            value={newLiability.description}
                            onChange={(e) => setNewLiability({ ...newLiability, description: e.target.value })}
                        />
                        <Input
                            type="number"
                            placeholder="Monto Total ($)"
                            value={newLiability.amount}
                            onChange={(e) => setNewLiability({ ...newLiability, amount: e.target.value })}
                        />
                        <Button onClick={handleAddLiability} className="bg-red-600 hover:bg-red-700">
                            <Plus className="h-4 w-4 mr-2" /> Agregar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Manual Liabilities */}
                {liabilities.map(l => (
                    <Card key={l.id} className="border-slate-200 hover:shadow-md transition-all group">
                        <CardContent className="pt-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                    <AlertCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">{l.description}</h4>
                                    <p className="text-xs text-slate-400 font-medium uppercase">{l.type}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-lg font-bold text-red-700">${Number(l.total_amount).toLocaleString()}</div>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteLiability(l.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="h-4 w-4 text-slate-300 hover:text-red-500" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {/* Automated Card Installments */}
                {cardInstallments.map(c => (
                    <Card key={c.id} className="border-orange-100 bg-orange-50/20 opacity-80">
                        <CardContent className="pt-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                    <CreditCard className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">{c.description}</h4>
                                    <p className="text-[10px] text-orange-600 font-bold uppercase tracking-tighter">Automático • Cuotas Futuras</p>
                                </div>
                            </div>
                            <div className="text-lg font-bold text-orange-700">${Number(c.amount).toLocaleString()}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
