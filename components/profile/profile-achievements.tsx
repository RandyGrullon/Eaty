"use client";

import {
  Calendar as CalendarIcon,
  Target,
  Award,
  Flame,
  Sparkles,
  Droplets,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Tonos con tokens del sistema (clases literales para que Tailwind las detecte).
const ACHIEVEMENTS_MAP = {
  first_meal: { label: "Primera comida", desc: "Has comenzado tu viaje.", icon: Sparkles, tone: "bg-primary/10 text-primary" },
  explorer: { label: "Explorador", desc: "10 comidas registradas", icon: CalendarIcon, tone: "bg-fat/15 text-fat" },
  nutrition_master: { label: "Maestro nutricional", desc: "50 comidas registradas", icon: Award, tone: "bg-accent text-accent-foreground" },
  streak_3: { label: "Racha de 3", desc: "3 días seguidos", icon: Flame, tone: "bg-carbs/20 text-foreground" },
  streak_7: { label: "Racha de 7", desc: "Una semana impecable", icon: Target, tone: "bg-protein/12 text-protein" },
  hydrated_hero: { label: "Héroe hidratado", desc: "8+ vasos de agua en un día", icon: Droplets, tone: "bg-water/15 text-water" },
} as const;

interface ProfileAchievementsProps {
  unlockedIds?: string[];
}

export function ProfileAchievements({ unlockedIds }: ProfileAchievementsProps) {
  const totalCount = Object.keys(ACHIEVEMENTS_MAP).length;
  const unlockedCount = unlockedIds?.filter((id) => id in ACHIEVEMENTS_MAP).length || 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Logros</h2>
        <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground tabular">
          {unlockedCount} de {totalCount} desbloqueados
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(ACHIEVEMENTS_MAP).map(([id, info]) => {
          const isUnlocked = unlockedIds?.includes(id);
          const Icon = info.icon;
          return (
            <div
              key={id}
              className={cn(
                "flex items-center gap-3 p-4",
                isUnlocked ? "surface" : "rounded-2xl border border-dashed border-border bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  isUnlocked ? info.tone : "bg-muted text-muted-foreground"
                )}
              >
                {isUnlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("font-semibold", !isUnlocked && "text-muted-foreground")}>{info.label}</p>
                <p className="text-sm text-muted-foreground">{info.desc}</p>
              </div>
              {!isUnlocked && <span className="sr-only">Bloqueado</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
