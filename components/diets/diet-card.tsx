"use client";

import { CheckCircle2, Flame, Sparkles, User } from "lucide-react";
import { dietDishImageUrl } from "@/lib/diets";
import { DIET_GOAL_LABEL, type Diet } from "@/types/diet";
import { cn } from "@/lib/utils";

export function DietCard({
  diet,
  isActive,
  onClick,
}: {
  diet: Diet;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/40 text-left shadow-lg shadow-black/[0.02] transition-all hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      <div className="relative h-36 w-full overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={diet.imageUrl ?? dietDishImageUrl(diet.name)}
          alt={diet.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className="rounded-full bg-background/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary backdrop-blur-sm">
            {DIET_GOAL_LABEL[diet.goal]}
          </span>
          {isActive && (
            <span className="flex items-center gap-1 rounded-full bg-chart-2 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
              <CheckCircle2 className="h-3 w-3" /> Activa
            </span>
          )}
        </div>
        <div className="absolute right-3 top-3">
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide backdrop-blur-sm",
              diet.createdBy === "ai"
                ? "bg-primary/80 text-primary-foreground"
                : "bg-background/80 text-foreground"
            )}
          >
            {diet.createdBy === "ai" ? (
              <>
                <Sparkles className="h-2.5 w-2.5" /> IA
              </>
            ) : (
              <>
                <User className="h-2.5 w-2.5" /> Tuya
              </>
            )}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="truncate text-base font-black tracking-tight text-white">
            {diet.name}
          </h3>
        </div>
      </div>
      <div className="flex items-center justify-between p-3">
        <span className="flex items-center gap-1.5 text-sm font-black tabular-nums text-primary">
          <Flame className="h-4 w-4" />
          {diet.targetCalories} kcal
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {diet.dishes.length} platos
        </span>
      </div>
    </button>
  );
}
