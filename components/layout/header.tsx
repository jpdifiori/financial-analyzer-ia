"use client";

import React from "react";
import { useLanguage } from "@/context/language-context";
import { LogOut, Globe, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export function Header() {
    const { language, setLanguage, t } = useLanguage();
    const [user, setUser] = React.useState<any>(null);

    React.useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 h-16">
            <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="h-9 w-9 bg-gradient-to-tr from-indigo-600 to-violet-400 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
                        <span className="text-white font-black text-lg">A</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-black text-white text-[10px] uppercase tracking-[0.2em] leading-tight">Analizador</span>
                        <span className="font-bold text-slate-500 text-[10px] uppercase tracking-[0.2em] leading-tight">Inteligencia Artificial</span>
                    </div>
                </Link>

                {/* Right Side Tools */}
                <div className="flex items-center gap-6">
                    {/* Language Switcher */}
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                        <button
                            onClick={() => setLanguage("es")}
                            className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${language === "es" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                                }`}
                        >
                            ES
                        </button>
                        <button
                            onClick={() => setLanguage("en")}
                            className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${language === "en" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                                }`}
                        >
                            EN
                        </button>
                    </div>

                    {/* User Profile & Logout */}
                    {user && (
                        <div className="flex items-center gap-4 pl-4 border-l border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 bg-slate-800 rounded-full flex items-center justify-center border border-white/10">
                                    <User className="h-4 w-4 text-slate-400" />
                                </div>
                                <span className="hidden md:block text-xs font-semibold text-slate-400">
                                    {user.email?.split("@")[0]}
                                </span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                                title={t("common.logout")}
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
