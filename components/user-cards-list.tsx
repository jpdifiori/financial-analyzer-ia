"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Loader2, Trash2, CreditCard, Plus, AlertCircle } from "lucide-react";

export function UserCardsList() {
    const [cards, setCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // [New Code] Manual Creation State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        bank: "",
        issuer: "Visa",
        last4: "",
        color: "slate"
    });

    useEffect(() => {
        fetchCards();
    }, []);

    const fetchCards = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { data, error } = await supabase
                .from("credit_cards")
                .select("*")
                .eq("user_id", session.user.id)
                .order("bank_name", { ascending: true });

            if (error) throw error;
            setCards(data || []);
        } catch (error) {
            console.error("Error fetching cards:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.bank || !formData.last4) {
            alert("Por favor completa el Banco y los últimos 4 dígitos.");
            return;
        }
        if (formData.last4.length !== 4) {
            alert("Los últimos dígitos deben ser exactamente 4 números.");
            return;
        }

        setIsCreating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { data, error } = await supabase
                .from("credit_cards")
                .insert({
                    user_id: session.user.id,
                    bank_name: formData.bank,
                    issuer: formData.issuer,
                    last_4: formData.last4,
                    color_theme: formData.color,
                    name: formData.bank // [FIX] Populate legacy 'name' column to satisfy constraint
                })
                .select()
                .single();

            if (error) throw error;

            setCards([...cards, data]);
            setIsDialogOpen(false);
            setFormData({ bank: "", issuer: "Visa", last4: "", color: "slate" }); // Reset
            alert("Tarjeta agregada correctamente. Los próximos resúmenes con terminación " + formData.last4 + " se vincularán automáticamente.");

        } catch (error: any) {
            console.error("Error creating card:", error);
            alert(`Error al crear la tarjeta: ${error.message || JSON.stringify(error)}`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (cardId: string) => {
        if (!confirm("¿Estás seguro de que quieres eliminar esta tarjeta? Se DESVINCULARÁN los resúmenes asociados (no se borrarán, pero perderán la referencia).")) return;

        setDeletingId(cardId);
        try {
            const { error } = await supabase
                .from("credit_cards")
                .delete()
                .eq("id", cardId);

            if (error) throw error;
            setCards(prev => prev.filter(c => c.id !== cardId));
        } catch (error) {
            console.error("Error deleting card:", error);
            alert("Error al eliminar la tarjeta.");
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-orange-600" /></div>;

    const getCardColor = (color: string) => {
        switch (color) {
            case 'orange': return 'from-orange-400 to-orange-600';
            case 'slate': return 'from-slate-700 to-slate-900';
            case 'blue': return 'from-blue-500 to-blue-700';
            case 'emerald': return 'from-emerald-400 to-emerald-600';
            case 'purple': return 'from-purple-500 to-purple-700';
            case 'rose': return 'from-rose-400 to-rose-600';
            default: return 'from-slate-700 to-slate-900';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <CreditCard className="h-6 w-6 text-orange-600" /> Mis Tarjetas
                </h2>
                <p className="text-gray-500 text-sm">Administra tus tarjetas de crédito registradas.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <div key={card.id} className={`relative group overflow-hidden rounded-xl shadow-lg transition-transform hover:-translate-y-1`}>
                        {/* Visual Card Representation */}
                        <div className={`h-48 bg-gradient-to-br ${getCardColor(card.color_theme)} p-6 text-white flex flex-col justify-between relative`}>
                            {/* Texture/Pattern Overlay */}
                            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay pointer-events-none"></div>

                            <div className="flex justify-between items-start z-10">
                                <div>
                                    <h3 className="font-bold text-lg tracking-wide">{card.bank_name || card.name}</h3>
                                    <p className="text-xs opacity-80 uppercase tracking-wider">{card.issuer}</p>
                                </div>
                                <CreditCard className="h-8 w-8 opacity-50" />
                            </div>

                            <div className="space-y-4 z-10">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-10 bg-yellow-200/20 rounded-md backdrop-blur-sm border border-yellow-100/30 flex items-center justify-center">
                                        <div className="h-5 w-7 border-2 border-yellow-400/50 rounded-sm"></div>
                                    </div>
                                    <div className="text-sm font-mono tracking-[0.2em] opacity-90">
                                        •••• {card.last_4 || "XXXX"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="bg-white p-3 border-x border-b border-gray-100 rounded-b-xl flex justify-between items-center">
                            <span className="text-xs text-gray-400 font-medium px-2">ID: ...{card.id.slice(-6)}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(card.id)}
                                disabled={deletingId === card.id}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                            >
                                {deletingId === card.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                <span className="ml-2 text-xs">Eliminar</span>
                            </Button>
                        </div>
                    </div>
                ))}

                {/* Add New Card Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <div className="h-full min-h-[14rem] border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer group">
                            <div className="bg-gray-100 group-hover:bg-white p-3 rounded-full mb-3 transition-colors shadow-sm">
                                <Plus className="h-6 w-6 text-orange-400" />
                            </div>
                            <p className="font-medium text-sm text-gray-600">Agregar Tarjeta Manual</p>
                            <p className="text-xs text-gray-400 mt-1">Ingresa los últimos 4 dígitos para<br />vincular resúmenes futuros.</p>
                        </div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Agregar Nueva Tarjeta</DialogTitle>
                            <DialogDescription>
                                Ingresa los detalles para identificar tu tarjeta. La vinculación automática se hará por los últimos 4 dígitos.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddCard} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Banco / Alias</label>
                                <input
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    placeholder="Ej: Galicia Crédito, Santander"
                                    value={formData.bank}
                                    onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Emisora</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                        value={formData.issuer}
                                        onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                                    >
                                        <option value="Visa">Visa</option>
                                        <option value="Mastercard">Mastercard</option>
                                        <option value="American Express">Amex</option>
                                        <option value="Otra">Otra</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Últimos 4 Núm.</label>
                                    <input
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                        placeholder="Ej: 1234"
                                        maxLength={4}
                                        pattern="\d{4}"
                                        value={formData.last4}
                                        onChange={(e) => setFormData({ ...formData, last4: e.target.value.replace(/\D/g, '') })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Color Identificativo</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                >
                                    <option value="slate">Negro / Gris (Default)</option>
                                    <option value="orange">Naranja (Galicia)</option>
                                    <option value="blue">Azul (BBVA / Amex)</option>
                                    <option value="rose">Rojo (Santander)</option>
                                    <option value="emerald">Verde</option>
                                    <option value="purple">Violeta</option>
                                </select>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isCreating} className="bg-orange-600 hover:bg-orange-700 text-white">
                                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Guardar Tarjeta
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {cards.length === 0 && (
                <div className="flex flex-col items-center justify-center p-8 bg-blue-50 text-blue-800 rounded-xl border border-blue-100">
                    <AlertCircle className="h-6 w-6 mb-2" />
                    <p className="font-semibold">No tienes tarjetas registradas aún.</p>
                </div>
            )}
        </div>
    );
}
