"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

export function NumberTicker({
    value,
    direction = "up",
    delay = 0,
    className,
}: {
    value: number;
    direction?: "up" | "down";
    delay?: number;
    className?: string;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(direction === "down" ? value : 0);
    const springValue = useSpring(motionValue, {
        damping: 20,
        stiffness: 200,
    });
    const isInView = useInView(ref, { once: true, margin: "0px" });

    useEffect(() => {
        if (isInView) {
            setTimeout(() => {
                motionValue.set(value);
            }, delay * 1000);
        }
    }, [motionValue, isInView, delay, value]);

    useEffect(
        () =>
            springValue.on("change", (latest) => {
                if (ref.current) {
                    let displayValue = latest;
                    // If close to target, snap to target
                    if (Math.abs(latest - value) < 1) {
                        displayValue = value;
                    }
                    // Optimization: For large numbers, step by 100s to look faster/cleaner as requested
                    else if (value > 1000) {
                        displayValue = Math.round(latest / 100) * 100;
                    }

                    ref.current.textContent = Intl.NumberFormat("en-US", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                    }).format(Math.round(displayValue));
                }
            }),
        [springValue, value]
    );

    return (
        <span
            className={className}
            ref={ref}
        />
    );
}
