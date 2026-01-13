"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableInputProps {
    initialValue: string;
    onSave: (value: string) => void;
    className?: string;
    placeholder?: string;
}

export function EditableInput({ initialValue, onSave, className, placeholder }: EditableInputProps) {
    const [value, setValue] = useState(initialValue);
    const isDirty = value !== initialValue && value.trim() !== "";

    return (
        <div className="flex items-center gap-2 group/input w-full relative">
            <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && isDirty) {
                        onSave(value);
                    }
                }}
                placeholder={placeholder}
                className={cn("bg-transparent border-0 focus:outline-none focus:ring-0 p-0 shadow-none w-full", className)}
            />
            {isDirty && (
                <button
                    onClick={() => onSave(value)}
                    className="p-1 bg-emerald-500/20 text-emerald-400 rounded-md hover:bg-emerald-500/30 transition-all animate-in zoom-in-50 duration-200"
                >
                    <Check className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
}
