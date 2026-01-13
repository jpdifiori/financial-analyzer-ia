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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Trash2, CreditCard, Plus, AlertCircle, Pencil, Sparkles, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DayPickerGrid = ({ selectedDay, onSelect }: { selectedDay: number | null, onSelect: (day: number) => void }) => {
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const dayLabels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    return (
        <div className="p-4 bg-slate-950 rounded-[24px] border border-white/10 shadow-3xl w-[280px]">
            <div className="grid grid-cols-7 gap-1 mb-2">
                {dayLabels.map((label, idx) => (
                    <div key={idx} className="text-[10px] font-black text-slate-600 text-center uppercase tracking-widest">{label}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {days.map(day => (
                    <button
                        key={day}
                        type="button"
                        onClick={() => onSelect(day)}
                        className={cn(
                            "h-8 w-8 rounded-xl text-xs font-bold transition-all flex items-center justify-center",
                            selectedDay === day
                                ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20 scale-110 z-10"
                                : "hover:bg-white/10 text-slate-400 hover:text-white"
                        )}
                    >
                        {day}
                    </button>
                ))}
            </div>
        </div>
    );
};

export function UserCardsList() {
    const [cards, setCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // [New Code] Manual Creation State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [editingCard, setEditingCard] = useState<any>(null);
    const [formData, setFormData] = useState({
        bank: "",
        issuer: "Visa",
        last4: "",
        color: "slate",
        closing_day: "",
        payment_day: ""
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
            toast.error("Por favor completa el Banco y los últimos 4 dígitos.");
            return;
        }
        if (formData.last4.length !== 4) {
            toast.error("Los últimos dígitos deben ser exactamente 4 números.");
            return;
        }

        const closingDayNum = formData.closing_day ? parseInt(formData.closing_day) : null;
        const paymentDayNum = formData.payment_day ? parseInt(formData.payment_day) : null;

        if (closingDayNum && (closingDayNum < 1 || closingDayNum > 31)) {
            toast.error("El día de cierre debe estar entre 1 y 31.");
            return;
        }
        if (paymentDayNum && (paymentDayNum < 1 || paymentDayNum > 31)) {
            toast.error("El día de pago debe estar entre 1 y 31.");
            return;
        }

        setIsCreating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const cardData = {
                user_id: session.user.id,
                bank_name: formData.bank,
                issuer: formData.issuer,
                last_4: formData.last4,
                color_theme: formData.color,
                name: formData.bank,
                closing_day: closingDayNum,
                payment_day: paymentDayNum
            };

            if (editingCard) {
                const { data, error } = await supabase
                    .from("credit_cards")
                    .update(cardData)
                    .eq("id", editingCard.id)
                    .select()
                    .single();

                if (error) throw error;
                setCards(cards.map(c => c.id === editingCard.id ? data : c));
                toast.success(`Tarjeta ${formData.bank} actualizada.`);
            } else {
                const { data, error } = await supabase
                    .from("credit_cards")
                    .insert(cardData)
                    .select()
                    .single();

                if (error) throw error;
                setCards([...cards, data]);
                toast.success(`Tarjeta ${formData.bank} agregada.`);
            }

            setIsDialogOpen(false);
            setEditingCard(null);
            setFormData({ bank: "", issuer: "Visa", last4: "", color: "slate", closing_day: "", payment_day: "" });

        } catch (error: any) {
            console.error("Error saving card:", error);
            toast.error(`Error: ${error.message || "Error desconocido"}`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleEditOpen = (card: any) => {
        setEditingCard(card);
        setFormData({
            bank: card.bank_name || card.name,
            issuer: card.issuer || "Visa",
            last4: card.last_4 || "",
            color: card.color_theme || "slate",
            closing_day: card.closing_day?.toString() || "",
            payment_day: card.payment_day?.toString() || ""
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (cardId: string) => {
        // We'll keep confirm for deletion as it's a destructive action and native dialog is safer for "Are you sure?" 
        // unless we implement a custom modal. But let's try to be consistent if the user insisted on "elegantes".
        // For now, I'll keep confirm but replace ALERT in the catch.
        if (!confirm("¿Estás seguro de que quieres eliminar esta tarjeta?")) return;

        setDeletingId(cardId);
        try {
            const { error } = await supabase
                .from("credit_cards")
                .delete()
                .eq("id", cardId);

            if (error) throw error;
            setCards(prev => prev.filter(c => c.id !== cardId));
            toast.success("Tarjeta eliminada");
        } catch (error) {
            console.error("Error deleting card:", error);
            toast.error("Error al eliminar la tarjeta.");
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
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditOpen(card)}
                                className="text-slate-500 hover:text-slate-700 hover:bg-slate-50 h-8 px-2"
                            >
                                <Pencil className="h-4 w-4" />
                                <span className="ml-2 text-xs">Editar</span>
                            </Button>
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
                    <DialogContent className="sm:max-w-[480px] bg-slate-950/80 border-white/10 text-white backdrop-blur-3xl overflow-hidden rounded-[28px] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        {/* Aurora UI Background Blobs */}
                        <div className="absolute top-[-10%] left-[-10%] w-[200px] h-[200px] bg-orange-500/10 rounded-full blur-[80px] -z-10" />
                        <div className="absolute bottom-[-10%] right-[-10%] w-[150px] h-[150px] bg-purple-500/10 rounded-full blur-[60px] -z-10" />

                        <DialogHeader className="relative z-10 space-y-2">
                            <DialogTitle className="text-3xl md:text-4xl font-serif font-black italic text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
                                {editingCard ? "Editar Tarjeta" : "Nueva Tarjeta"}
                            </DialogTitle>
                            <DialogDescription className="text-slate-400 font-medium italic opacity-70">
                                {editingCard ? "Modifica los parámetros de tu activo financiero." : "Configura los detalles para la identificación inteligente."}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddCard} className="space-y-6 py-6 relative z-10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Banco / Alias</label>
                                <input
                                    className="flex h-12 w-full rounded-[16px] border border-white/5 bg-white/[0.03] px-4 py-2 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:border-orange-500/30 focus:bg-white/[0.05]"
                                    placeholder="Ej: Galicia Crédito, Santander"
                                    value={formData.bank}
                                    onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Emisora</label>
                                    <select
                                        className="flex h-12 w-full rounded-[16px] border border-white/5 bg-white/[0.03] px-4 py-2 text-sm text-white outline-none transition-all focus:border-orange-500/30 focus:bg-white/[0.05] appearance-none"
                                        value={formData.issuer}
                                        onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                                    >
                                        <option className="bg-slate-900" value="Visa">Visa</option>
                                        <option className="bg-slate-900" value="Mastercard">Mastercard</option>
                                        <option className="bg-slate-900" value="American Express">Amex</option>
                                        <option className="bg-slate-900" value="Otra">Otra</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Últimos 4 Núm.</label>
                                    <input
                                        className="flex h-12 w-full rounded-[16px] border border-white/5 bg-white/[0.03] px-4 py-2 text-sm text-white font-mono placeholder:text-slate-600 outline-none transition-all focus:border-orange-500/30 focus:bg-white/[0.05]"
                                        placeholder="Ej: 1234"
                                        maxLength={4}
                                        pattern="\d{4}"
                                        value={formData.last4}
                                        onChange={(e) => setFormData({ ...formData, last4: e.target.value.replace(/\D/g, '') })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Día de Cierre</label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button
                                                type="button"
                                                className="flex h-12 w-full items-center justify-between rounded-[16px] border border-white/5 bg-white/[0.03] px-4 py-2 text-sm text-white outline-none transition-all hover:bg-white/[0.05] focus:border-orange-500/30"
                                            >
                                                <span className={formData.closing_day ? "text-white font-mono" : "text-slate-600"}>
                                                    {formData.closing_day || "Seleccionar"}
                                                </span>
                                                <CalendarIcon className="h-4 w-4 text-slate-500" />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-slate-950 border-white/10 backdrop-blur-3xl rounded-2xl" align="start">
                                            <DayPickerGrid
                                                selectedDay={formData.closing_day ? parseInt(formData.closing_day) : null}
                                                onSelect={(day) => setFormData({ ...formData, closing_day: day.toString() })}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Día de Pago</label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button
                                                type="button"
                                                className="flex h-12 w-full items-center justify-between rounded-[16px] border border-white/5 bg-white/[0.03] px-4 py-2 text-sm text-white outline-none transition-all hover:bg-white/[0.05] focus:border-orange-500/30"
                                            >
                                                <span className={formData.payment_day ? "text-white font-mono" : "text-slate-600"}>
                                                    {formData.payment_day || "Seleccionar"}
                                                </span>
                                                <CalendarIcon className="h-4 w-4 text-slate-500" />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-slate-950 border-white/10 backdrop-blur-3xl rounded-2xl" align="end">
                                            <DayPickerGrid
                                                selectedDay={formData.payment_day ? parseInt(formData.payment_day) : null}
                                                onSelect={(day) => setFormData({ ...formData, payment_day: day.toString() })}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Color Identificativo</label>
                                <select
                                    className="flex h-12 w-full rounded-[16px] border border-white/5 bg-white/[0.03] px-4 py-2 text-sm text-white outline-none transition-all focus:border-orange-500/30 focus:bg-white/[0.05] appearance-none"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                >
                                    <option className="bg-slate-900" value="slate">Negro / Gris (Default)</option>
                                    <option className="bg-slate-900" value="orange">Naranja (Galicia)</option>
                                    <option className="bg-slate-900" value="blue">Azul (BBVA / Amex)</option>
                                    <option className="bg-slate-900" value="rose">Rojo (Santander)</option>
                                    <option className="bg-slate-900" value="emerald">Verde</option>
                                    <option className="bg-slate-900" value="purple">Violeta</option>
                                </select>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="submit" disabled={isCreating} className="w-full h-14 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black uppercase tracking-[0.2em] text-xs rounded-[16px] shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                                    {isCreating ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                                    ) : (
                                        <Sparkles className="h-4 w-4 text-white" />
                                    )}
                                    {editingCard ? "Actualizar Tarjeta" : "Guardar Tarjeta"}
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
