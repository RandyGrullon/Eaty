"use client";

import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Target,
  Award,
  Flame,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ACHIEVEMENTS_MAP = {
  first_meal: { label: "Primera Comida", desc: "¡Has comenzado tu viaje!", icon: Sparkles, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  explorer: { label: "Explorador", desc: "10 comidas registradas", icon: CalendarIcon, color: "text-blue-500", bg: "bg-blue-500/10" },
  nutrition_master: { label: "Maestro Nutricional", desc: "50 comidas registradas", icon: Award, color: "text-purple-500", bg: "bg-purple-500/10" },
  streak_3: { label: "Racha de 3", desc: "3 días seguidos", icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10" },
  streak_7: { label: "Racha de 7", desc: "¡Una semana impecable!", icon: Target, color: "text-red-500", bg: "bg-red-500/10" },
  hydrated_hero: { icon: Award, label: "Héroe Hidratado", desc: "8+ vasos de agua en un día", color: "text-cyan-500", bg: "bg-cyan-500/10" },
} as const;

interface ProfileAchievementsProps {
  unlockedIds?: string[];
}

export function ProfileAchievements({ unlockedIds }: ProfileAchievementsProps) {
  return (
    <section className="space-y-6 pb-20">
      <h2 className="text-2xl font-black tracking-tight text-foreground">Logros y Medallas</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(ACHIEVEMENTS_MAP).map(([id, info]) => {
          const isUnlocked = unlockedIds?.includes(id);
          const Icon = info.icon;
          return (
            <div
              key={id}
              className={cn(
                "relative overflow-hidden rounded-[2rem] border p-6 transition-all duration-500",
                isUnlocked
                  ? "border-border/40 bg-card/40 shadow-xl shadow-black/[0.02] grayscale-0 opacity-100"
                  : "border-dashed border-border/20 bg-muted/5 grayscale opacity-40"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-inner",
                  isUnlocked ? info.bg : "bg-muted"
                )}>
                  <Icon className={cn("h-7 w-7", isUnlocked ? info.color : "text-muted-foreground")} />
                </div>
                <div>
                  <p className="font-black text-foreground">{info.label}</p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground leading-snug">{info.desc}</p>
                </div>
              </div>
              {!isUnlocked && (
                <div className="absolute top-2 right-4">
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter border-muted-foreground/20 text-muted-foreground/40">Bloqueado</Badge>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
