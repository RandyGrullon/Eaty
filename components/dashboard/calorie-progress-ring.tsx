"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CalorieProgressRingProps {
  consumed: number;
  goal: number;
  overGoal: boolean;
}

export function CalorieProgressRing({
  consumed,
  goal,
  overGoal,
}: CalorieProgressRingProps) {
  const pctRaw = goal > 0 ? consumed / goal : 0;
  const pctDisplay = Math.min(pctRaw, 1);
  const r = 58;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - pctDisplay);

  return (
    <div className="flex flex-col items-center">
      <div className="relative mx-auto h-[220px] w-[220px] shrink-0 group">
        <div className={cn(
          "absolute inset-8 rounded-full blur-2xl opacity-20 transition-all duration-700",
          overGoal ? "bg-warning" : "bg-primary"
        )} />

        <svg
          width="220"
          height="220"
          viewBox="0 0 140 140"
          className="absolute inset-0 -rotate-90 drop-shadow-sm"
          aria-hidden
        >
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            className="stroke-muted/40"
            strokeWidth="8"
          />
          <motion.circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: dash }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className={cn(overGoal ? "stroke-warning" : "stroke-primary")}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <span className="text-4xl font-black tabular-nums tracking-tighter text-foreground sm:text-5xl">
              {Math.round(pctRaw * 100)}%
            </span>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", overGoal ? "bg-warning" : "bg-primary")} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                Logrado
              </span>
            </div>
          </motion.div>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-10">
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Consumidas</p>
          <p className="text-lg font-black tabular-nums text-foreground">{consumed}</p>
        </div>
        <div className="h-8 w-px bg-border/40" />
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Objetivo</p>
          <p className="text-lg font-black tabular-nums text-foreground">{goal}</p>
        </div>
      </div>
    </div>
  );
}
