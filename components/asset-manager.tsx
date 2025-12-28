"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ASSET_TYPES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, Wallet, Building2 } from "lucide-react";

export function AssetManager() {
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState<any[]>([]);
    const [newAsset, setNewAsset] = useState({ type: ASSET_TYPES[0], customType: "", description: "", amount: "" });

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
                amount: parseFloat(newAsset.amount)
            });

            if (error) throw error;
            setNewAsset({ type: ASSET_TYPES[0], customType: "", description: "", amount: "" });
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

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-orange-500" /></div>;

    const totalAssets = assets.reduce((sum, a) => sum + Number(a.amount), 0);

    return (
        <div className="space-y-6">
            <Card className="border-emerald-100 bg-emerald-50/30">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-700">
                            <Building2 className="h-5 w-5" /> Tus Activos (Lo que Tienes)
                        </div>
                        <div className="text-2xl font-black text-emerald-800">${totalAssets.toLocaleString()}</div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                        <select
                            value={newAsset.type}
                            onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>

                        {newAsset.type === "Otros" && (
                            <Input
                                placeholder="¿Qué tipo?"
                                value={newAsset.customType}
                                onChange={(e) => setNewAsset({ ...newAsset, customType: e.target.value })}
                            />
                        )}

                        <Input
                            placeholder="Descripción (ej: Cuenta Sueldo)"
                            value={newAsset.description}
                            onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                        />
                        <Input
                            type="number"
                            placeholder="Monto ($)"
                            value={newAsset.amount}
                            onChange={(e) => setNewAsset({ ...newAsset, amount: e.target.value })}
                        />
                        <Button onClick={handleAddAsset} className="bg-emerald-600 hover:bg-emerald-700">
                            <Plus className="h-4 w-4 mr-2" /> Agregar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assets.map(asset => (
                    <Card key={asset.id} className="border-slate-200 hover:shadow-md transition-all group">
                        <CardContent className="pt-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <Wallet className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">{asset.description}</h4>
                                    <p className="text-xs text-slate-400 font-medium uppercase">{asset.type}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-lg font-bold text-emerald-700">${Number(asset.amount).toLocaleString()}</div>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteAsset(asset.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="h-4 w-4 text-slate-300 hover:text-red-500" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
