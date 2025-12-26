"use strict";
import { useState, useEffect } from "react";
import { CreditCard, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CreditCardType {
    id: string;
    bank_name: string;
    issuer: string;
    last_4: string;
    color_theme: string;
}

interface CreditCardFilterProps {
    selectedCardId: string | null;
    onSelectCard: (id: string | null) => void;
}

export function CreditCardFilter({ selectedCardId, onSelectCard }: CreditCardFilterProps) {
    const [cards, setCards] = useState<CreditCardType[]>([]);

    useEffect(() => {
        const fetchCards = async () => {
            const { data } = await supabase.from("credit_cards").select("*");
            if (data) setCards(data);
        };
        fetchCards();
    }, []);

    if (cards.length === 0) return null;

    return (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {/* 'Todas' Option */}
            <button
                onClick={() => onSelectCard(null)}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl border transition-all whitespace-nowrap
                    ${selectedCardId === null
                        ? "bg-slate-900 text-white border-slate-900 ring-2 ring-slate-100"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}
                `}
            >
                <div className="p-1 rounded-full bg-white/20">
                    <CreditCard className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold">Todas</span>
                {selectedCardId === null && <Check className="h-3 w-3 ml-1" />}
            </button>

            {/* Individual Cards */}
            {cards.map((card) => {
                const isSelected = selectedCardId === card.id;

                // Color mapping
                const colorClasses: Record<string, string> = {
                    orange: "bg-orange-600 border-orange-600 ring-orange-100",
                    blue: "bg-blue-600 border-blue-600 ring-blue-100",
                    emerald: "bg-emerald-600 border-emerald-600 ring-emerald-100",
                    purple: "bg-purple-600 border-purple-600 ring-purple-100",
                    rose: "bg-rose-600 border-rose-600 ring-rose-100",
                    slate: "bg-slate-700 border-slate-700 ring-slate-100",
                };

                const baseColor = colorClasses[card.color_theme] || colorClasses.slate;

                return (
                    <button
                        key={card.id}
                        onClick={() => onSelectCard(card.id)}
                        className={`
                            relative group flex items-center gap-3 px-4 py-2 rounded-xl border transition-all whitespace-nowrap min-w-[160px]
                            ${isSelected
                                ? `${baseColor} text-white ring-2`
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:shadow-sm"}
                        `}
                    >
                        {/* Card Visual Icon */}
                        <div className={`
                            w-8 h-5 rounded overflow-hidden relative shadow-sm border border-white/20
                            ${isSelected ? "bg-white/20" : `bg-gradient-to-br from-${card.color_theme}-500 to-${card.color_theme}-600`}
                        `}>
                            <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white/50"></div>
                        </div>

                        <div className="flex flex-col items-start text-xs">
                            <span className={`font-bold uppercase ${isSelected ? "text-white" : "text-slate-800"}`}>
                                {card.bank_name}
                            </span>
                            <span className={`${isSelected ? "text-white/80" : "text-slate-400"}`}>
                                {card.issuer} {card.last_4 ? `• ${card.last_4}` : ""}
                            </span>
                        </div>

                        {isSelected && <Check className="absolute top-2 right-2 h-3 w-3 text-white/50" />}
                    </button>
                );
            })}
        </div>
    );
}
