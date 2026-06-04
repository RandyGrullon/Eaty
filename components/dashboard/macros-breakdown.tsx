"use client";

import { motion } from "framer-motion";
import { MacroPieChart } from "./macro-pie-chart";

type Macros = { protein: number; carbs: number; fat: number };

interface MacrosBreakdownProps {
  consumed: Macros;
  goal: Macros;
}

// Clases Tailwind literales (el JIT no soporta nombres construidos dinámicamente).
const MACRO_META = [
  { key: "protein" as const, label: "Proteína", valueClass: "text-chart-1", trackClass: "bg-chart-1/30", barClass: "bg-chart-1", wrapClass: "" },
  { key: "carbs" as const, label: "Carbos", valueClass: "text-chart-2", trackClass: "bg-chart-2/30", barClass: "bg-chart-2", wrapClass: "border-x border-border/40 px-2" },
  { key: "fat" as const, label: "Grasa", valueClass: "text-chart-4", trackClass: "bg-chart-4/30", barClass: "bg-chart-4", wrapClass: "" },
];

export function MacrosBreakdown({ consumed, goal }: MacrosBreakdownProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="col-span-2 grid grid-cols-1 sm:grid-cols-12 gap-6 rounded-[2rem] border border-border/40 bg-card/40 p-6 shadow-inner backdrop-blur-sm"
    >
      <div className="sm:col-span-4 h-32">
        <MacroPieChart macros={consumed} />
      </div>
      <div className="sm:col-span-8 grid grid-cols-3 gap-3">
        {MACRO_META.map(({ key, label, valueClass, trackClass, barClass, wrapClass }) => {
          const consumedValue = consumed[key];
          const goalValue = goal[key];
          const pct = goalValue > 0 ? Math.min(100, (consumedValue / goalValue) * 100) : 0;
          return (
            <div key={key} className={`text-center group ${wrapClass}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 mb-1">
                {label}
              </p>
              <div className="flex flex-col items-center">
                <p className={`text-2xl font-black tabular-nums ${valueClass} group-hover:scale-110 transition-transform`}>
                  {consumedValue}g
                </p>
                <p className="text-[9px] font-bold text-muted-foreground/60 mt-0.5">Meta {goalValue}g</p>
                <div className={`mt-1 h-1 w-full max-w-[40px] rounded-full ${trackClass} overflow-hidden`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    className={`h-full ${barClass}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
