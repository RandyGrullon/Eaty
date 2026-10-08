"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Droplet, Droplets, Plus, Minus } from "lucide-react";
import { useAppData } from "@/hooks/use-app-data";
import { useAuth } from "@/hooks/use-auth";
import { awardPoints } from "@/lib/meals";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface HydrationTrackerProps {
  glasses: number;
  /** Meta diaria de vasos (250 ml). */
  goal?: number;
}

export function HydrationTracker({ glasses, goal = 8 }: HydrationTrackerProps) {
  const { setWaterGlasses } = useAppData();
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async (delta: number) => {
    if (updating) return;
    setUpdating(true);
    try {
      await setWaterGlasses(delta);
      // Otorga puntos por hidratación (10 por vaso, solo si suma).
      if (delta > 0 && user) {
        awardPoints(user.uid, 10).catch((e) =>
          logger.error("Error awarding points for water", e)
        );
      }
    } catch (e) {
      logger.error("Error updating water", e);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-water/12 text-water">
            <Droplets className="h-[18px] w-[18px]" />
          </span>
          <div>
            <p className="text-sm font-semibold">Hidratación</p>
            <p className="text-xs text-muted-foreground tabular">
              {(glasses * 0.25).toLocaleString("es", { maximumFractionDigits: 2 })} L de {goal * 0.25} L
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => handleUpdate(-1)}
            disabled={updating || glasses <= 0}
            aria-label="Quitar un vaso"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className="h-8 w-8 rounded-full bg-water text-white hover:bg-water/90"
            onClick={() => handleUpdate(1)}
            disabled={updating}
            aria-label="Añadir un vaso"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-8 gap-1.5" aria-label={`${glasses} de ${goal} vasos`}>
        {Array.from({ length: goal }).map((_, i) => (
          <Droplet
            key={i}
            className={cn(
              "h-6 w-full transition-colors",
              i < glasses ? "fill-water text-water" : "text-border"
            )}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}
