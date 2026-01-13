"use client";

import { Challenge, Milestone, Habit, Task } from "@/types/challenges";
import { Plus, Trash2, CheckCircle2, Circle, Flag, Repeat, CheckSquare, Calendar } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { MilestoneDetailsModal } from "./milestone-details-modal";

interface RoadmapTabProps {
    challenge: Challenge;
    onUpdate: (updated: Challenge) => void;
}

export function RoadmapTab({ challenge, onUpdate }: RoadmapTabProps) {
    const [activeSection, setActiveSection] = useState<"milestones" | "habits" | "tasks">("milestones");
    const [inputValue, setInputValue] = useState("");
    const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

    const addItem = async () => {
        if (!inputValue) return;

        const type = activeSection === "milestones" ? "milestone" : activeSection === "habits" ? "habit" : "task";

        const { data, error } = await supabase
            .from("challenge_roadmap")
            .insert([{
                challenge_id: challenge.id,
                title: inputValue,
                type: type,
                completed: false,
                completed_days: [],
                status: 'pending',
                priority: 'medium'
            }])
            .select()
            .single();

        if (error || !data) return;

        const newChallenge = { ...challenge };
        if (activeSection === "milestones") {
            newChallenge.roadmap.milestones.push({
                id: data.id,
                title: data.title,
                completed: data.completed,
                status: 'pending',
                priority: 'medium'
            });
        } else if (activeSection === "habits") {
            newChallenge.roadmap.habits.push({ id: data.id, title: data.title, frequency: "diaria", completedDays: [] });
        } else {
            newChallenge.roadmap.tasks.push({ id: data.id, title: data.title, completed: data.completed });
        }

        onUpdate(newChallenge);
        setInputValue("");
    };

    const handleMilestoneUpdate = (updated: Milestone) => {
        const newChallenge = { ...challenge };
        newChallenge.roadmap.milestones = newChallenge.roadmap.milestones.map((m: Milestone) =>
            m.id === updated.id ? updated : m
        );
        onUpdate(newChallenge);
    };

    const toggleItem = async (type: string, id: string) => {
        const items = type === "milestone" ? challenge.roadmap.milestones : challenge.roadmap.tasks;
        const item = items.find((i: any) => i.id === id);
        if (!item) return;

        const isCompleted = !item.completed;
        const newStatus = isCompleted ? "completed" : "pending";

        const { error } = await supabase
            .from("challenge_roadmap")
            .update({
                completed: isCompleted,
                status: type === "milestone" ? newStatus : undefined
            })
            .eq("id", id);

        if (error) return;

        const newChallenge = { ...challenge };
        if (type === "milestone") {
            newChallenge.roadmap.milestones = newChallenge.roadmap.milestones.map((m: Milestone) =>
                m.id === id ? { ...m, completed: isCompleted, status: newStatus as any } : m
            );
        } else if (type === "task") {
            newChallenge.roadmap.tasks = newChallenge.roadmap.tasks.map((t: Task) =>
                t.id === id ? { ...t, completed: isCompleted } : t
            );
        }
        onUpdate(newChallenge);
    };

    const removeItem = async (type: string, id: string) => {
        const { error } = await supabase
            .from("challenge_roadmap")
            .delete()
            .eq("id", id);

        if (error) return;

        const newChallenge = { ...challenge };
        if (type === "milestone") {
            newChallenge.roadmap.milestones = newChallenge.roadmap.milestones.filter((m: Milestone) => m.id !== id);
        } else if (type === "habit") {
            newChallenge.roadmap.habits = newChallenge.roadmap.habits.filter((h: Habit) => h.id !== id);
        } else if (type === "task") {
            newChallenge.roadmap.tasks = newChallenge.roadmap.tasks.filter((t: Task) => t.id !== id);
        }
        onUpdate(newChallenge);
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "critical": return "text-red-500 bg-red-500/10";
            case "high": return "text-orange-400 bg-orange-400/10";
            case "medium": return "text-indigo-400 bg-indigo-400/10";
            default: return "text-slate-500 bg-slate-500/10";
        }
    };

    return (
        <div className="space-y-12 pb-20 font-jakarta">
            {/* Input & Selector */}
            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[40px] space-y-8">
                <div className="flex flex-wrap gap-2 p-1.5 bg-slate-950 rounded-2xl w-fit border border-white/5">
                    {[
                        { id: "milestones", label: "Hitos", icon: Flag },
                        { id: "habits", label: "Hábitos", icon: Repeat },
                        { id: "tasks", label: "Tareas", icon: CheckSquare },
                    ].map((s) => (
                        <button
                            key={s.id}
                            onClick={() => setActiveSection(s.id as any)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest
                                ${activeSection === s.id ? "bg-white text-slate-950 shadow-lg shadow-white/5" : "text-slate-500 hover:text-slate-300"}
                            `}
                        >
                            <s.icon className="h-3.5 w-3.5" />
                            {s.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-3 w-full">
                        <label className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] pl-2 flex items-center gap-2">
                            <Plus className="h-3 w-3" /> Añadir {activeSection === "milestones" ? "Hito" : activeSection === "habits" ? "Hábito" : "Tarea"}
                        </label>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addItem()}
                            placeholder={`Ej: ${activeSection === "milestones" ? "Llegar al campamento base" : activeSection === "habits" ? "Correr 5km cada mañana" : "Comprar botas de montaña"}`}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-800"
                        />
                    </div>
                    <Button
                        onClick={addItem}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl p-4 h-[62px] w-full md:w-auto px-10 font-bold uppercase tracking-widest text-xs"
                    >
                        Añadir
                    </Button>
                </div>
            </div>

            {/* List Areas */}
            <div className="grid md:grid-cols-3 gap-12">
                {/* Milestones Area */}
                <div className={`space-y-6 ${activeSection !== "milestones" && "md:opacity-40 transition-opacity"}`}>
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3 text-indigo-400">
                            <Flag className="h-4 w-4" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Hitos Estratégicos</h3>
                        </div>
                        <span className="text-[10px] font-bold text-slate-700">{challenge.roadmap.milestones.length}</span>
                    </div>
                    <div className="space-y-4">
                        {challenge.roadmap.milestones.map((item: Milestone) => (
                            <div
                                key={item.id}
                                onClick={() => setSelectedMilestone(item)}
                                className="group relative p-6 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-[32px] transition-all cursor-pointer hover:shadow-2xl hover:shadow-indigo-500/5 active:scale-[0.98]"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleItem("milestone", item.id); }}
                                                className="mt-1 shrink-0"
                                            >
                                                {item.completed ? <CheckCircle2 className="h-5 w-5 text-indigo-500" /> : <Circle className="h-5 w-5 text-slate-800" />}
                                            </button>
                                            <div className="space-y-1">
                                                <span className={`font-bold text-sm leading-tight transition-all ${item.completed ? "text-slate-600 line-through" : "text-white"}`}>
                                                    {item.title}
                                                </span>
                                                {item.targetDate && (
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(item.targetDate).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter shrink-0 ${getPriorityColor(item.priority)}`}>
                                            {item.priority}
                                        </div>
                                    </div>
                                    {item.description && (
                                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed italic">
                                            "{item.description}"
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeItem("milestone", item.id); }}
                                    className="absolute -top-2 -right-2 bg-slate-950 border border-slate-800 opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-500 rounded-full transition-all shadow-xl"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Habits Area */}
                <div className={`space-y-6 ${activeSection !== "habits" && "md:opacity-40 transition-opacity"}`}>
                    <div className="flex items-center justify-between px-2 text-pink-400">
                        <div className="flex items-center gap-3">
                            <Repeat className="h-4 w-4" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Rituales Diarios</h3>
                        </div>
                        <span className="text-[10px] font-bold text-slate-700">{challenge.roadmap.habits.length}</span>
                    </div>
                    <div className="space-y-3">
                        {challenge.roadmap.habits.map((item: Habit) => (
                            <div key={item.id} className="group relative p-6 bg-slate-900/60 border border-slate-800 rounded-[32px]">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="font-bold text-sm leading-tight text-slate-100">
                                        {item.title}
                                    </span>
                                    <button onClick={() => removeItem("habit", item.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-700 hover:text-red-400 transition-all">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                <div className="mt-6 flex gap-1.5">
                                    {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                        <div key={day} className="h-1.5 flex-1 rounded-full bg-slate-800" />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tasks Area */}
                <div className={`space-y-6 ${activeSection !== "tasks" && "md:opacity-40 transition-opacity"}`}>
                    <div className="flex items-center justify-between px-2 text-emerald-400">
                        <div className="flex items-center gap-3">
                            <CheckSquare className="h-4 w-4" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Tareas Operativas</h3>
                        </div>
                        <span className="text-[10px] font-bold text-slate-700">{challenge.roadmap.tasks.length}</span>
                    </div>
                    <div className="space-y-3">
                        {challenge.roadmap.tasks.map((item: Task) => (
                            <div key={item.id} className="group relative p-6 bg-slate-900 border border-slate-800 rounded-[32px]">
                                <div className="flex items-start gap-4">
                                    <button onClick={() => toggleItem("task", item.id)} className="mt-1">
                                        {item.completed ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-800" />}
                                    </button>
                                    <span className={`font-bold text-sm leading-tight transition-all ${item.completed ? "text-slate-600 line-through" : "text-white"}`}>
                                        {item.title}
                                    </span>
                                </div>
                                <button onClick={() => removeItem("task", item.id)} className="absolute -top-2 -right-2 bg-slate-950 border border-slate-800 opacity-0 group-hover:opacity-100 p-2 text-slate-700 hover:text-red-400 rounded-full transition-all shadow-xl">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <MilestoneDetailsModal
                milestone={selectedMilestone}
                open={!!selectedMilestone}
                onClose={() => setSelectedMilestone(null)}
                onUpdate={handleMilestoneUpdate}
            />
        </div>
    );
}
