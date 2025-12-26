"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface FinancialTankProps {
    totalIncome: number;
    totalExpenses: number;
    currency: string;
}

export function FinancialTank({ totalIncome, totalExpenses, currency }: FinancialTankProps) {
    const [level, setLevel] = useState(0);

    // Calculate percentage remaining
    // If expenses > income, level is 0 (empty tank)
    const remaining = Math.max(0, totalIncome - totalExpenses);
    const percentage = totalIncome > 0 ? (remaining / totalIncome) * 100 : 0;

    // Animate on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setLevel(percentage);
        }, 100);
        return () => clearTimeout(timer);
    }, [percentage]);

    // Determine color based on health
    // Green > 50%, Yellow > 20%, Red < 20%
    const getColor = (pct: number) => {
        if (pct > 50) return "text-emerald-500 fill-emerald-500";
        if (pct > 20) return "text-yellow-500 fill-yellow-500";
        return "text-red-500 fill-red-500";
    };

    const colorClass = getColor(percentage);

    return (
        <div className="flex flex-col items-center justify-center p-4">
            {/* Tank Container */}
            <div className="relative w-32 h-44 bg-slate-100 rounded-xl border-4 border-slate-300 shadow-inner overflow-hidden">

                {/* Background Grid/Lines */}
                <div className="absolute inset-0 opacity-20 pointer-events-none flex flex-col justify-between py-2 px-1">
                    <div className="w-full h-px bg-slate-400"></div>
                    <div className="w-full h-px bg-slate-400"></div>
                    <div className="w-full h-px bg-slate-400"></div>
                    <div className="w-full h-px bg-slate-400"></div>
                </div>

                {/* Liquid */}
                <div
                    className={cn("absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-in-out bg-current opacity-80", colorClass)}
                    style={{ height: `${level}%` }}
                >
                    {/* Bubbles / Wave Effect (Simple CSS) */}
                    <div className="absolute top-0 left-0 right-0 h-2 bg-white/30 animate-pulse"></div>
                </div>

                {/* Glass Reflection */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none rounded-lg"></div>
            </div>

            {/* Labels */}
            <div className="mt-4 text-center">
                <p className="text-sm font-medium text-gray-500">Balance Disponible</p>
                <p className={cn("text-2xl font-bold transition-colors duration-500", colorClass.split(' ')[0])}>
                    {Math.round(percentage)}%
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    ${remaining.toLocaleString()} {currency}
                </p>
            </div>
        </div>
    );
}
