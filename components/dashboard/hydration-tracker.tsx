"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Droplets, Plus, Minus } from "lucide-react";
import { useAppData } from "@/hooks/use-app-data";
import { useAuth } from "@/hooks/use-auth";
import { awardPoints } from "@/lib/meals";
import { logger } from "@/lib/logger";

interface HydrationTrackerProps {
  glasses: number;
}

export function HydrationTracker({ glasses }: HydrationTrackerProps) {
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
    <div className="flex flex-col h-full justify-between">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-2/10 text-chart-2">
          <Droplets className="h-5 w-5" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
          Hidratación
        </span>
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black tabular-nums">{glasses}</span>
          <span className="text-[10px] font-bold text-muted-foreground">VASOS</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => handleUpdate(-1)}
            disabled={updating || glasses <= 0}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg border-chart-2/40 hover:bg-chart-2/5"
            onClick={() => handleUpdate(1)}
            disabled={updating}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
