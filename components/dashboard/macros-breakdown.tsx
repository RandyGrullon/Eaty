"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Macros = { protein: number; carbs: number; fat: number };

interface MacrosBreakdownProps {
  consumed: Macros;
  goal: Macros;
  className?: string;
}

// Clases literales: Tailwind no detecta nombres construidos dinámicamente.
export const MACRO_META = [
  { key: "protein" as const, label: "Proteína", dot: "bg-protein", bar: "bg-protein", track: "bg-protein/15" },
  { key: "carbs" as const, label: "Carbohidratos", dot: "bg-carbs", bar: "bg-carbs", track: "bg-carbs/20" },
  { key: "fat" as const, label: "Grasa", dot: "bg-fat", bar: "bg-fat", track: "bg-fat/15" },
];

export function MacrosBreakdown({ consumed, goal, className }: MacrosBreakdownProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {MACRO_META.map(({ key, label, dot, bar, track }, i) => {
        const value = Math.round(consumed[key]);
        const target = Math.round(goal[key]);
        const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
        return (
          <div key={key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 font-medium">
                <span className={cn("h-2 w-2 rounded-full", dot)} aria-hidden />
                {label}
              </span>
              <span className="tabular text-muted-foreground">
                <span className="font-semibold text-foreground">{value}</span> / {target} g
              </span>
            </div>
            <div className={cn("h-2 overflow-hidden rounded-full", track)}>
              <motion.div
                className={cn("h-full rounded-full", bar)}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
