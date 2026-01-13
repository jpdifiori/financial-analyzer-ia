"use client";

import { Challenge } from "@/types/challenges";
import { Quote, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface PurposeSectionProps {
    challenge: Challenge;
    onUpdate: (updated: Challenge) => void;
}

export function PurposeSection({ challenge, onUpdate }: PurposeSectionProps) {
    const [motivation, setMotivation] = useState(challenge.purpose.motivation);
    const [transformation, setTransformation] = useState(challenge.purpose.transformation);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await onUpdate({
            ...challenge,
            purpose: { motivation, transformation }
        });
        setTimeout(() => setIsSaving(false), 1000);
    };

    return (
        <div className="space-y-12">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h2 className="text-sm font-black uppercase tracking-widest text-indigo-400">Configuración del Propósito</h2>
                    <p className="text-slate-500 text-xs">Define el núcleo de tu Misogi.</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8 py-4 font-bold uppercase tracking-widest text-[10px]"
                >
                    {isSaving ? "Guardando..." : "Guardar Cambios"}
                </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-indigo-400">
                            <Quote className="h-6 w-6" />
                            <h2 className="text-2xl font-black uppercase tracking-tight">Mi Motivación</h2>
                        </div>
                        <p className="text-slate-500 text-sm italic">
                            El "¿Por qué?" detrás de este desafío. ¿Qué te impulsa a levantarte y enfrentar la incomodidad?
                        </p>
                        <textarea
                            value={motivation}
                            onChange={(e) => setMotivation(e.target.value)}
                            placeholder="Escribe aquí tu fuego interno..."
                            className="w-full h-48 bg-slate-900/50 border border-slate-800 rounded-3xl p-6 text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors resize-none text-lg leading-relaxed"
                        />
                    </div>

                    <div className="p-8 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-300 space-y-4">
                        <h3 className="font-bold flex items-center gap-2">
                            <Sparkles className="h-4 w-4" /> Tip de Jesse Itzler
                        </h3>
                        <p className="text-sm leading-relaxed opacity-80">
                            "No lo haces por la medalla. Lo haces para demostrarte a ti mismo quién eres cuando las cosas se ponen difíciles."
                        </p>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-indigo-400">
                            <Sparkles className="h-6 w-6" />
                            <h2 className="text-2xl font-black uppercase tracking-tight">Mi Transformación</h2>
                        </div>
                        <p className="text-slate-500 text-sm italic">
                            La Meta de Identidad. No qué lograrás, sino en quién te convertirás al terminar.
                        </p>
                        <textarea
                            value={transformation}
                            onChange={(e) => setTransformation(e.target.value)}
                            placeholder="Define tu nueva identidad..."
                            className="w-full h-48 bg-slate-900/50 border border-slate-800 rounded-3xl p-6 text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors resize-none text-lg leading-relaxed"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
                            <div className="text-slate-500 text-[10px] font-black uppercase">Probabilidad de Éxito</div>
                            <div className="text-2xl font-black text-indigo-500">50%</div>
                        </div>
                        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
                            <div className="text-slate-500 text-[10px] font-black uppercase">Dificultad</div>
                            <div className="text-2xl font-black text-white">MISOGI</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
