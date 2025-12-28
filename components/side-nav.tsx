"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard, Scale, CreditCard, ArrowDownToDot,
    TrendingDown, ShoppingBag, Target, Rocket,
    LineChart, Users, Shield, Brain, Menu, X, LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NavItem {
    id: string;
    label: string;
    icon: any;
    category?: string;
    href?: string;
}

const NAV_ITEMS: NavItem[] = [
    { id: "dashboard", label: "Resumen", icon: LayoutDashboard, category: "Core" },
    { id: "balance", label: "Balance", icon: Scale, category: "Core" },
    { id: "card", label: "Tarjeta (PDF)", icon: CreditCard, category: "Core" },

    { id: "income", label: "Ingresos", icon: ArrowDownToDot, category: "Tracking" },
    { id: "fixed", label: "Fijos", icon: TrendingDown, category: "Tracking" },
    { id: "variable", label: "Variables", icon: ShoppingBag, category: "Tracking" },

    { id: "budget", label: "Presupuestos", icon: Target, category: "Planning" },
    { id: "goals", label: "Metas", icon: Rocket, category: "Planning" },
    { id: "networth", label: "Patrimonio", icon: LineChart, category: "Planning" },

    { id: "partner", label: "Socios", icon: Users, category: "Social" },
    { id: "audit", label: "Auditoría", icon: Shield, category: "Social", href: "/audit" },
    { id: "coach", label: "Coach IA", icon: Brain, category: "Social", href: "/coach" },
];

interface SideNavProps {
    activeTab: string;
    setActiveTab: (id: any) => void;
    onLogout: () => void;
    userEmail?: string;
}

export function SideNav({ activeTab, setActiveTab, onLogout, userEmail }: SideNavProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const categories = Array.from(new Set(NAV_ITEMS.map(i => i.category)));

    const renderLink = (item: NavItem) => {
        const isActive = activeTab === item.id;

        const content = (
            <>
                <item.icon className={cn("h-5 w-5 transition-colors", isActive ? "text-orange-500" : "text-slate-400 group-hover:text-slate-200")} />
                <span className="font-medium">{item.label}</span>
                {isActive && (
                    <motion.div
                        layoutId="active-pill"
                        className="absolute left-0 w-1 h-6 bg-orange-500 rounded-r-full"
                    />
                )}
            </>
        );

        if (item.href) {
            return (
                <a
                    key={item.id}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all group relative"
                >
                    {content}
                </a>
            );
        }

        return (
            <button
                key={item.id}
                onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                }}
                className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group relative",
                    isActive ? "bg-orange-500/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
            >
                {content}
            </button>
        );
    };

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 z-40 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-gradient-to-tr from-orange-600 to-amber-400 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-orange-900/20">
                        A
                    </div>
                    <span className="font-bold text-white tracking-tight">Analizador IA</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-slate-400 hover:text-white"
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-64 bg-slate-950 border-r border-white/5 h-screen sticky top-0 overflow-y-auto p-4 custom-scrollbar">
                <div className="flex items-center gap-3 mb-10 px-2 pt-2">
                    <div className="h-10 w-10 bg-gradient-to-tr from-orange-600 to-amber-400 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-xl shadow-orange-900/40">
                        A
                    </div>
                    <div>
                        <h1 className="font-black text-white tracking-tighter text-lg leading-none">ANALIZADOR</h1>
                        <p className="text-[10px] text-orange-500 font-bold tracking-widest uppercase">Finanzas IA</p>
                    </div>
                </div>

                <div className="flex-1 space-y-8">
                    {categories.map(cat => (
                        <div key={cat} className="space-y-1">
                            <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{cat}</h3>
                            {NAV_ITEMS.filter(i => i.category === cat).map(item => renderLink(item))}
                        </div>
                    ))}
                </div>

                <div className="mt-10 pt-6 border-t border-white/5 space-y-4">
                    <div className="px-4">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Usuario</p>
                        <p className="text-sm text-slate-300 truncate font-medium">{userEmail}</p>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-medium"
                    >
                        <LogOut className="h-5 w-5" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Mobile Drawer */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-[280px] bg-slate-950 z-50 lg:hidden flex flex-col p-4 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-8 px-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 bg-orange-600 rounded-lg flex items-center justify-center font-bold text-white">A</div>
                                    <span className="font-bold text-white">Menu</span>
                                </div>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400"><X /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar">
                                {categories.map(cat => (
                                    <div key={cat} className="space-y-1">
                                        <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{cat}</h3>
                                        {NAV_ITEMS.filter(i => i.category === cat).map(item => renderLink(item))}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={onLogout}
                                className="mt-8 flex items-center gap-3 px-4 py-4 rounded-2xl bg-red-500/10 text-red-400 transition-all font-bold text-sm"
                            >
                                <LogOut className="h-5 w-5" />
                                Cerrar Sesión
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
