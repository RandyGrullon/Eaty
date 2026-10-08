"use client";

import { CheckCircle2, Flame, Sparkles, User } from "lucide-react";
import { dietDishImageUrl } from "@/lib/diets";
import { DIET_GOAL_LABEL, type Diet } from "@/types/diet";
import { MealThumb } from "@/components/meal/meal-thumb";

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
      className="surface group relative flex w-full flex-col overflow-hidden text-left transition-colors hover:border-primary/40"
    >
      <MealThumb
        src={diet.imageUrl ?? dietDishImageUrl(diet.name)}
        alt={diet.name}
        className="h-36 w-full"
        iconClassName="h-8 w-8"
      />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {DIET_GOAL_LABEL[diet.goal]}
          </span>
          {isActive && (
            <span className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
              <CheckCircle2 className="h-3 w-3" /> Activa
            </span>
          )}
          <span className="ml-auto flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {diet.createdBy === "ai" ? (
              <>
                <Sparkles className="h-3 w-3" /> IA
              </>
            ) : (
              <>
                <User className="h-3 w-3" /> Tuya
              </>
            )}
          </span>
        </div>
        <h3 className="truncate text-base font-semibold">{diet.name}</h3>
        <div className="mt-auto flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 font-semibold tabular text-primary">
            <Flame className="h-4 w-4" />
            {diet.targetCalories} kcal
          </span>
          <span className="text-xs text-muted-foreground tabular">{diet.dishes.length} platos</span>
        </div>
      </div>
    </button>
  );
}
