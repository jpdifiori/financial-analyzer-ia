"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard, Scale, CreditCard, ArrowDownToDot,
    TrendingDown, ShoppingBag, Target, Rocket,
    LineChart, Users, Shield, Brain, Menu, X, LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useLanguage } from "@/context/language-context";

interface NavItem {
    id: string;
    labelKey: string;
    icon: any;
    categoryKey: string;
    href?: string;
}

const NAV_ITEMS: NavItem[] = [
    { id: "dashboard", labelKey: "finance.nav.dashboard", icon: LayoutDashboard, categoryKey: "Core" },
    { id: "balance", labelKey: "finance.nav.balance", icon: Scale, categoryKey: "Core" },

    { id: "card", labelKey: "finance.nav.card", icon: CreditCard, categoryKey: "Tracking" },
    { id: "income", labelKey: "finance.nav.income", icon: ArrowDownToDot, categoryKey: "Tracking" },
    { id: "fixed", labelKey: "finance.nav.fixed", icon: TrendingDown, categoryKey: "Tracking" },
    { id: "variable", labelKey: "finance.nav.variable", icon: ShoppingBag, categoryKey: "Tracking" },

    { id: "budget", labelKey: "finance.nav.budget", icon: Target, categoryKey: "Planning" },
    { id: "goals", labelKey: "finance.nav.goals", icon: Rocket, categoryKey: "Planning" },

    { id: "partner", labelKey: "finance.nav.partner", icon: Users, categoryKey: "Social" },
];

interface SideNavProps {
    activeTab: string;
    setActiveTab: (id: any) => void;
    onLogout?: () => void;
    userEmail?: string;
}

export function SideNav({ activeTab, setActiveTab, onLogout, userEmail }: SideNavProps) {
    const { t } = useLanguage();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const categories = Array.from(new Set(NAV_ITEMS.map(i => i.categoryKey)));

    const renderLink = (item: NavItem) => {
        const isActive = activeTab === item.id;
        const label = t(item.labelKey);

        const content = (
            <>
                <item.icon className={cn("h-5 w-5 transition-all duration-300",
                    isActive ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "text-slate-500 group-hover:text-slate-300"
                )} />
                <span className={cn("font-sans font-medium text-sm tracking-wide transition-colors duration-300",
                    isActive ? "text-cyan-50 font-bold" : "text-slate-400 group-hover:text-slate-200"
                )}>{label}</span>
                {isActive && (
                    <motion.div
                        layoutId="active-pill"
                        className="absolute right-0 w-1 h-8 bg-cyan-400 rounded-l-full shadow-[0_0_15px_rgba(34,211,238,0.6)]"
                    />
                )}
            </>
        );

        if (item.href) {
            return (
                <a
                    key={item.id}
                    href={item.href}
                    className="flex items-center gap-4 px-6 py-3 transition-all group relative"
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
                    "w-full flex items-center gap-4 px-6 py-3 transition-all group relative",
                    isActive
                        ? "bg-white/5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] border-y border-transparent" // Glass active state
                        : "hover:bg-white/5"
                )}
            >
                {content}
            </button>
        );
    };

    return (
        <>
            {/* Mobile Toggle Button (Mini) */}
            <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden fixed top-20 left-4 z-40 h-10 w-10 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center text-slate-200 shadow-xl"
            >
                <Menu className="h-5 w-5" />
            </button>

            {/* Desktop Sidebar - Aurora Glass */}
            <aside className="hidden lg:flex flex-col w-72 bg-slate-950 border-r border-white/5 h-screen sticky top-0 overflow-y-auto p-6 scrollbar-hide relative z-20">
                {/* Subtle Gradient for Sidebar */}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 to-transparent pointer-events-none" />

                <div className="relative z-10 flex items-center gap-3 mb-12 px-2">
                    <div className="h-10 w-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                        F
                    </div>
                    <div>
                        <h1 className="font-sans font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight text-lg leading-none uppercase">
                            {t("finance.title") || "FINANZAS"}
                        </h1>
                        <p className="text-[10px] text-cyan-400 font-bold tracking-[0.2em] uppercase mt-1 glow-sm">Aurora Engine</p>
                    </div>
                </div>

                <div className="relative z-10 flex-1 space-y-10">
                    {categories.map(cat => (
                        <div key={cat} className="space-y-2">
                            <h3 className="px-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.25em] mb-4">
                                {cat}
                            </h3>
                            <div className="space-y-1">
                                {NAV_ITEMS.filter(i => i.categoryKey === cat).map(item => renderLink(item))}
                            </div>
                        </div>
                    ))}
                </div>

                {onLogout && (
                    <div className="relative z-10 mt-12 pt-8 border-t border-white/5">
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all font-bold text-[10px] uppercase tracking-widest shadow-lg"
                        >
                            <LogOut className="h-4 w-4" />
                            {t("common.logout") || "Cerrar Sesión"}
                        </button>
                    </div>
                )}
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
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] lg:hidden"
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-slate-950 border-r border-white/10 z-[70] lg:hidden flex flex-col p-8 shadow-2xl overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-12">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center font-black text-white text-xl">F</div>
                                    <span className="font-sans font-black text-white tracking-tight text-lg uppercase">FINANZAS</span>
                                </div>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="flex-1 space-y-10 scrollbar-hide">
                                {categories.map(cat => (
                                    <div key={cat} className="space-y-2">
                                        <h3 className="px-6 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">{cat}</h3>
                                        <div className="space-y-1">
                                            {NAV_ITEMS.filter(i => i.categoryKey === cat).map(item => renderLink(item))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {onLogout && (
                                <button
                                    onClick={onLogout}
                                    className="mt-12 flex items-center gap-4 px-6 py-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 transition-all font-bold text-xs uppercase tracking-widest"
                                >
                                    <LogOut className="h-5 w-5" />
                                    Cerrar Sesión
                                </button>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
