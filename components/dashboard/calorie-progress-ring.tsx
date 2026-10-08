"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CalorieProgressRingProps {
  consumed: number;
  goal: number;
  overGoal: boolean;
  size?: number;
}

/** Anillo de progreso diario: en el centro, lo que queda (o lo que sobra). */
export function CalorieProgressRing({ consumed, goal, overGoal, size = 196 }: CalorieProgressRingProps) {
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const r = 60;
  const c = 2 * Math.PI * r;
  const remaining = Math.abs(goal - consumed);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 140 140" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="70" cy="70" r={r} fill="none" strokeWidth="11" className="stroke-muted" />
        <motion.circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className={cn(overGoal ? "stroke-warning" : "stroke-primary")}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-[40px] font-bold leading-none tabular">{remaining}</span>
        <span className="mt-1.5 text-xs text-muted-foreground">
          {overGoal ? "kcal por encima" : "kcal restantes"}
        </span>
      </div>
    </div>
  );
}
