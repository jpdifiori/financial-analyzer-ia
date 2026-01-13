"use client";

import React, { useEffect, useState } from "react";
import { getMissions } from "@/app/actions/command";
import { CommandMission } from "@/types/command";
import { supabase } from "@/lib/supabase";
import { Loader2, Target, Plus, Calendar, AlertCircle } from "lucide-react";
import { CreateMissionDialog } from "./create-mission-dialog";
import { MissionDetailDialog } from "./mission-detail-dialog";
import { cn } from "@/lib/utils";

export function MissionsView() {
    const [missions, setMissions] = useState<CommandMission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [selectedMission, setSelectedMission] = useState<CommandMission | null>(null);

    const loadMissions = async (uid: string) => {
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (token) {
                const data = await getMissions(token, uid);
                setMissions(data || []);
            }
        } catch (error) {
            console.error("Error loading missions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (user) {
                setUserId(user.id);
                loadMissions(user.id);
            }
        });
    }, []);

    if (isLoading && !userId) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Target className="h-6 w-6 text-indigo-500" />
                    <span className="text-xl font-bold text-white">Misiones</span>
                    <span className="text-sm font-medium text-slate-500 bg-slate-900 px-2 py-0.5 rounded-md border border-white/5">
                        {missions.length}
                    </span>
                </div>
                {userId && (
                    <CreateMissionDialog userId={userId} onMissionCreated={() => loadMissions(userId)}>
                        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20">
                            <Plus className="h-4 w-4" />
                            Nueva Misión
                        </button>
                    </CreateMissionDialog>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {missions.map((mission) => (
                    <div
                        key={mission.id}
                        onClick={() => setSelectedMission(mission)}
                        className="group bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 hover:border-indigo-500/30 p-6 rounded-2xl transition-all flex flex-col justify-between min-h-[180px] cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors" />

                        <div className="space-y-3 relative z-10">
                            <div className="flex justify-between items-start">
                                <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                                    {mission.name}
                                </h3>
                                <span className={cn(
                                    "text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider border",
                                    mission.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-800 text-slate-400 border-white/5"
                                )}>
                                    {mission.status}
                                </span>
                            </div>

                            {mission.objective && (
                                <p className="text-sm text-slate-400 leading-relaxed line-clamp-2 italic">
                                    "{mission.objective}"
                                </p>
                            )}

                            <div className="flex gap-2 pt-2">
                                <span className={cn(
                                    "text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest",
                                    mission.priority === "critical" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                        mission.priority === "high" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                                            "bg-slate-500/10 text-slate-400 border-slate-500/10"
                                )}>
                                    {mission.priority}
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 relative z-10">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3" />
                                {mission.due_date ? new Date(mission.due_date).toLocaleDateString() : "Sin fecha"}
                            </div>
                            <div className="text-indigo-500/50 font-bold group-hover:text-indigo-400 transition-colors flex items-center gap-1">
                                Ver Detalle <Plus className="h-3 w-3" />
                            </div>
                        </div>
                    </div>
                ))}

                {missions.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                        <Target className="h-12 w-12 mb-4 opacity-20" />
                        <p className="font-bold text-slate-400">No tienes Misiones activas</p>
                        <p className="text-sm text-slate-600 mb-6">Define tus objetivos estratégicos y deja que la IA te ayude a desglosarlos.</p>
                    </div>
                )}
            </div>

            {selectedMission && (
                <MissionDetailDialog
                    mission={selectedMission}
                    open={!!selectedMission}
                    onOpenChange={(open) => !open && setSelectedMission(null)}
                    onUpdate={() => userId && loadMissions(userId)}
                />
            )}
        </div>
    );
}
