"use client";

import { Challenge, Resource } from "@/types/challenges";
import { Plus, Trash2, CheckCircle2, Circle, GraduationCap, Package } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ResourcesTabProps {
    challenge: Challenge;
    onUpdate: (updated: Challenge) => void;
}

import { supabase } from "@/lib/supabase";

export function ResourcesTab({ challenge, onUpdate }: ResourcesTabProps) {
    const [newItem, setNewItem] = useState({ title: "", type: "skill" as "skill" | "equipment" });

    const addItem = async () => {
        if (!newItem.title) return;

        const { data, error } = await supabase
            .from("challenge_resources")
            .insert([{
                challenge_id: challenge.id,
                title: newItem.title,
                type: newItem.type,
                acquired: false
            }])
            .select()
            .single();

        if (!error && data) {
            onUpdate({
                ...challenge,
                resources: [...challenge.resources, {
                    id: data.id,
                    title: data.title,
                    type: data.type as any,
                    acquired: data.acquired
                }]
            });
            setNewItem({ title: "", type: "skill" });
        }
    };

    const toggleResource = async (id: string) => {
        const item = challenge.resources.find(r => r.id === id);
        if (!item) return;

        const { error } = await supabase
            .from("challenge_resources")
            .update({ acquired: !item.acquired })
            .eq("id", id);

        if (!error) {
            onUpdate({
                ...challenge,
                resources: challenge.resources.map(r =>
                    r.id === id ? { ...r, acquired: !r.acquired } : r
                )
            });
        }
    };

    const removeResource = async (id: string) => {
        const { error } = await supabase
            .from("challenge_resources")
            .delete()
            .eq("id", id);

        if (!error) {
            onUpdate({
                ...challenge,
                resources: challenge.resources.filter(r => r.id !== id)
            });
        }
    };

    const skills = challenge.resources.filter(r => r.type === "skill");
    const equipment = challenge.resources.filter(r => r.type === "equipment");

    return (
        <div className="space-y-12">
            {/* Input Header */}
            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl space-y-6">
                <div className="space-y-2 text-center md:text-left">
                    <h2 className="text-2xl font-black uppercase tracking-tight">Preparar la mochila</h2>
                    <p className="text-slate-500 text-sm">¿Qué habilidades necesitas desarrollar y qué materiales adquirir?</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-2 w-full">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-2">Descripción</label>
                        <input
                            type="text"
                            value={newItem.title}
                            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                            placeholder="Ej: Curso de escalada en hielo..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-2">Tipo</label>
                        <select
                            value={newItem.type}
                            onChange={(e) => setNewItem({ ...newItem, type: e.target.value as any })}
                            className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none min-w-[140px]"
                        >
                            <option value="skill">Habilidad</option>
                            <option value="equipment">Equipo</option>
                        </select>
                    </div>
                    <Button
                        onClick={addItem}
                        className="bg-white text-slate-950 hover:bg-slate-200 rounded-2xl p-4 h-[58px] w-full md:w-auto px-8"
                    >
                        <Plus className="h-6 w-6" />
                    </Button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
                {/* Skills Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 text-indigo-400">
                        <GraduationCap className="h-6 w-6" />
                        <h3 className="text-xl font-black uppercase tracking-tight">Habilidades</h3>
                    </div>

                    <div className="space-y-3">
                        {skills.map(item => (
                            <div key={item.id} className="group flex items-center justify-between p-5 bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-indigo-500/30 transition-all">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => toggleResource(item.id)}>
                                        {item.acquired ? (
                                            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                        ) : (
                                            <Circle className="h-6 w-6 text-slate-700 hover:text-indigo-400 transition-colors" />
                                        )}
                                    </button>
                                    <span className={`font-bold transition-all ${item.acquired ? "text-slate-500 line-through" : "text-slate-100"}`}>
                                        {item.title}
                                    </span>
                                </div>
                                <button onClick={() => removeResource(item.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-red-400 transition-all">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Equipment Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 text-emerald-400">
                        <Package className="h-6 w-6" />
                        <h3 className="text-xl font-black uppercase tracking-tight">Equipo & Materiales</h3>
                    </div>

                    <div className="space-y-3">
                        {equipment.map(item => (
                            <div key={item.id} className="group flex items-center justify-between p-5 bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-emerald-500/30 transition-all">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => toggleResource(item.id)}>
                                        {item.acquired ? (
                                            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                        ) : (
                                            <Circle className="h-6 w-6 text-slate-700 hover:text-emerald-400 transition-colors" />
                                        )}
                                    </button>
                                    <span className={`font-bold transition-all ${item.acquired ? "text-slate-500 line-through" : "text-slate-100"}`}>
                                        {item.title}
                                    </span>
                                </div>
                                <button onClick={() => removeResource(item.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-red-400 transition-all">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
