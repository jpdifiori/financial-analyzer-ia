"use client";

import React, { useState, useEffect } from "react";
import { Header } from "./header";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { CommandCalendar } from "@/components/command/command-calendar";
import { supabase } from "@/lib/supabase";

export function GlobalLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setIsAuthenticated(!!session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsAuthenticated(!!session);
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <div className="min-h-screen bg-slate-950">
            <Header />
            <AnimatePresence mode="wait">
                <motion.div
                    key={pathname}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="pt-16" // Offset for the fixed header
                >
                    {children}
                </motion.div>
            </AnimatePresence>

            {/* Global Floating Calendar - Only for authenticated users */}
            {isAuthenticated && (
                <CommandCalendar />
            )}
        </div>
    );
}
