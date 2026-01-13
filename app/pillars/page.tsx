"use client";

import { useEffect, useState } from "react";
import {
    Heart,
    Users,
    Zap,
    Brain,
    Briefcase,
    Wallet,
    Compass,
    ArrowRight,
    Search,
    Filter
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Pillar, PillarType } from "@/types/pillars";
import { useLanguage } from "@/context/language-context";

const PILLAR_CONFIG: Record<PillarType, { name: string; description: string; icon: any; color: string; border: string; bg: string }> = {
    body: {
        name: "Cuerpo y Vitalidad",
        description: "Transforma tu cuerpo en una fuente de energía inagotable para conquistar tus metas.",
        icon: Heart,
        color: "text-emerald-400",
        border: "border-emerald-500/20",
        bg: "bg-emerald-500/10"
    },
    relationships: {
        name: "Vínculos y Comunidad",
        description: "Construye y nutre vínculos profundos que formen una comunidad de apoyo incondicional.",
        icon: Users,
        color: "text-purple-400",
        border: "border-purple-500/20",
        bg: "bg-purple-500/10"
    },
    inner_strength: {
        name: "Fortaleza Interior",
        description: "Domina tu mundo interior para ser inquebrantable ante los desafíos del mundo exterior.",
        icon: Zap,
        color: "text-amber-400",
        border: "border-amber-500/20",
        bg: "bg-amber-500/10"
    },
    mind: {
        name: "Mente y Maestría",
        description: "Desarrolla tu mente como una herramienta de élite para aprender rápido y crear oportunidades.",
        icon: Brain,
        color: "text-blue-400",
        border: "border-blue-500/20",
        bg: "bg-blue-500/10"
    },
    mission: {
        name: "Misión y Carrera",
        description: "Define y ejecuta tu obra, convirtiendo tu carrera en una misión de alto impacto.",
        icon: Briefcase,
        color: "text-orange-400",
        border: "border-orange-500/20",
        bg: "bg-orange-500/10"
    },
    finance: {
        name: "Finanzas y Libertad",
        description: "Domina el juego del dinero para que sea una herramienta que te compre libertad y tiempo.",
        icon: Wallet,
        color: "text-indigo-400",
        border: "border-indigo-500/20",
        bg: "bg-indigo-500/10"
    },
    lifestyle: {
        name: "Calidad de Vida y Aventura",
        description: "Diseña un estilo de vida que de gloria, belleza y experiencias memorables.",
        icon: Compass,
        color: "text-cyan-400",
        border: "border-cyan-500/20",
        bg: "bg-cyan-500/10"
    }
};

export default function PillarsPage() {
    const { t } = useLanguage();
    const [pillars, setPillars] = useState<Pillar[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadPillars();
    }, []);

    const loadPillars = async () => {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch existing pillars
        const { data, error } = await supabase
            .from('pillars')
            .select('*')
            .eq('user_id', user.id);

        if (error) {
            console.error("Error loading pillars:", error);
        } else {
            // Check if all 7 pillars exist, if not, create them
            const existingTypes = data?.map(p => p.type) || [];
            const missingTypes = (Object.keys(PILLAR_CONFIG) as PillarType[]).filter(type => !existingTypes.includes(type));

            if (missingTypes.length > 0) {
                const newPillars = missingTypes.map(type => ({
                    user_id: user.id,
                    type,
                    name: PILLAR_CONFIG[type].name,
                    description: PILLAR_CONFIG[type].description
                }));

                const { data: created, error: createError } = await supabase
                    .from('pillars')
                    .insert(newPillars)
                    .select();

                if (!createError && created) {
                    setPillars([...(data || []), ...created]);
                }
            } else {
                setPillars(data || []);
            }
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
            {/* Header Section */}
            <div className="max-w-7xl mx-auto space-y-12">
                <header className="space-y-4 text-center">
                    <h1 className="text-6xl font-serif text-white tracking-tighter text-glow drop-shadow-2xl">
                        Pilares <span className="italic text-white/40">de Identidad</span>
                    </h1>
                    <p className="text-slate-500 max-w-2xl mx-auto text-sm font-medium leading-relaxed">
                        Este es tu centro de diseño. Aquí dejas de ser una creación de tu pasado para convertirte en el arquitecto de tu futuro.
                    </p>
                </header>

                {/* Search & Actions Bar */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-y border-white/5 py-8">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-full px-4 py-2 flex items-center gap-2">
                            <Search className="h-4 w-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Buscar en pilares..."
                                className="bg-transparent border-none outline-none text-xs w-48 placeholder:text-slate-600"
                            />
                        </div>
                        <button className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/30 transition-all">
                            <Filter className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                            Total {pillars.length} Pilares
                        </span>
                    </div>
                </div>

                {/* Bento Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(7)].map((_, i) => (
                            <div key={i} className="aspect-[4/3] rounded-[48px] bg-white/5 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {pillars.map((pillar) => {
                            const config = PILLAR_CONFIG[pillar.type as PillarType];
                            const Icon = config.icon;
                            return (
                                <Link
                                    key={pillar.id}
                                    href={`/pillars/${pillar.id}`}
                                    className={cn(
                                        "group relative aspect-[4/3] rounded-[48px] overflow-hidden border bg-slate-900 shadow-2xl transition-all duration-700 hover:scale-[1.02] hover:-translate-y-2",
                                        config.border,
                                        "hover:border-white/30"
                                    )}
                                >
                                    {/* Visual Accent Layer */}
                                    <div className={cn("absolute inset-0 opacity-10 transition-opacity duration-1000 group-hover:opacity-20", config.bg)} />

                                    <div className="relative z-10 p-8 md:p-10 h-full flex flex-col justify-between">
                                        <div className="space-y-4">
                                            <div className={cn("h-16 w-16 rounded-[24px] border flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-xl", config.border, config.bg)}>
                                                <Icon className={cn("h-8 w-8", config.color)} />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-2xl font-black tracking-tighter text-white group-hover:text-glow transition-all">
                                                    {pillar.name}
                                                </h3>
                                                <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-2 italic">
                                                    {pillar.description}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-white/5 group-hover:border-white/20 flex items-center justify-between transition-colors">
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-white transition-colors">
                                                Gestionar Arquitectura
                                            </span>
                                            <div className={cn("h-10 w-10 rounded-full border flex items-center justify-center transition-all duration-500 group-hover:bg-white group-hover:text-slate-950 shadow-lg", config.border)}>
                                                <ArrowRight className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
