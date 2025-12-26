"use client";

import * as React from "react";
import { Check, ChevronsUpDown, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

interface MultiSelectCardFilterProps {
    selectedCardIds: string[];
    onChange: (ids: string[]) => void;
}

export function MultiSelectCardFilter({
    selectedCardIds,
    onChange,
}: MultiSelectCardFilterProps) {
    const [open, setOpen] = React.useState(false);
    const [cards, setCards] = React.useState<any[]>([]);

    React.useEffect(() => {
        const fetchCards = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { data } = await supabase
                .from("credit_cards")
                .select("id, bank_name, issuer, last_4")
                .eq("user_id", session.user.id);

            setCards(data || []);
        };
        fetchCards();
    }, []);

    const handleSelect = (cardId: string) => {
        if (selectedCardIds.includes(cardId)) {
            onChange(selectedCardIds.filter((id) => id !== cardId));
        } else {
            onChange([...selectedCardIds, cardId]);
        }
    };

    const isAllSelected = selectedCardIds.length === 0;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full md:w-[250px] justify-between h-10"
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <CreditCard className="h-4 w-4 shrink-0 opacity-50" />
                        {isAllSelected ? (
                            <span className="text-muted-foreground">Todas las Tarjetas</span>
                        ) : (
                            <div className="flex gap-1 overflow-hidden">
                                {selectedCardIds.length > 2 ? (
                                    <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                        {selectedCardIds.length} seleccionadas
                                    </Badge>
                                ) : (
                                    cards
                                        .filter((c) => selectedCardIds.includes(c.id))
                                        .map((c) => (
                                            <Badge
                                                key={c.id}
                                                variant="secondary"
                                                className="rounded-sm px-1 font-normal whitespace-nowrap"
                                            >
                                                {c.bank_name} {c.last_4}
                                            </Badge>
                                        ))
                                )}
                            </div>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0">
                <Command>
                    <CommandInput placeholder="Buscar tarjeta..." />
                    <CommandEmpty>No se encontraron tarjetas.</CommandEmpty>
                    <CommandGroup>
                        {/* Option for 'All Cards' explicitly if needed, but 'unselect all' acts as 'all' */}
                        <CommandItem
                            onSelect={() => onChange([])} // Clear selection means ALL
                            className="cursor-pointer font-medium"
                        >
                            <Check
                                className={cn(
                                    "mr-2 h-4 w-4",
                                    isAllSelected ? "opacity-100" : "opacity-0"
                                )}
                            />
                            Todas las Tarjetas
                        </CommandItem>

                        {cards.map((card) => (
                            <CommandItem
                                key={card.id}
                                onSelect={() => handleSelect(card.id)}
                                className="cursor-pointer"
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedCardIds.includes(card.id) ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                <div className="flex flex-col">
                                    <span>{card.bank_name} {card.issuer}</span>
                                    <span className="text-xs text-muted-foreground">•••• {card.last_4}</span>
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
