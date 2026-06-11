"use client";

import { Button } from "@/components/ui/button";
import {
  Camera,
  UtensilsCrossed,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatMealDate } from "@/lib/date-format";
import type { Meal } from "@/types/meal";

interface RecentMealsProps {
  loading: boolean;
  meals: Meal[];
  onSelect: (meal: Meal) => void;
  onViewHistory: () => void;
}

export function RecentMeals({ loading, meals, onSelect, onViewHistory }: RecentMealsProps) {
  return (
    <>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">
            Últimas comidas
          </h2>
          <p className="text-sm font-medium text-muted-foreground">
            Tu registro fotográfico más reciente
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="group gap-1 text-primary hover:bg-primary/5 font-bold"
          onClick={onViewHistory}
        >
          Ver todo
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>

      <div className="relative">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
          </div>
        ) : meals.length > 0 ? (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.05 } },
            }}
            className="grid grid-cols-1 gap-3"
          >
            {meals.map((meal) => (
              <motion.button
                key={meal.id}
                variants={{
                  hidden: { opacity: 0, x: -10 },
                  show: { opacity: 1, x: 0 },
                }}
                type="button"
                onClick={() => onSelect(meal)}
                className="group flex w-full items-center gap-4 rounded-3xl border border-border/40 bg-card/40 p-3 pr-5 text-left transition-all hover:bg-card hover:shadow-xl hover:shadow-black/[0.02] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 sm:gap-5"
              >
                <div className="relative shrink-0">
                  <div className="h-14 w-14 overflow-hidden rounded-2xl border border-border/40 bg-muted shadow-inner sm:h-16 sm:w-16">
                    {meal.imageUrl ? (
                      <img
                        src={meal.imageUrl}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Camera className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {meal.foodName}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mt-0.5">
                    {formatMealDate(meal.createdAt)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xl font-black tabular-nums text-primary tracking-tighter">
                    {meal.calories}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    kcal
                  </p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <div className="rounded-[2.5rem] border-2 border-dashed border-border/40 bg-muted/20 py-16 text-center">
            <UtensilsCrossed className="mx-auto h-12 w-12 text-muted-foreground/20 mb-4" />
            <p className="text-sm font-bold text-muted-foreground">
              Aún no hay comidas registradas.
            </p>
            <Button variant="link" className="mt-2 text-primary font-bold">Escanea tu primer plato ahora</Button>
          </div>
        )}
      </div>
    </>
  );
}
