"use client";

import { Flame, Beef, Wheat, Droplets as FatIcon, Sparkles, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { VolumetricScanResult } from "@/lib/scan/frame-utils";

interface LiveResultCardProps {
  result: VolumetricScanResult;
  previousResult: VolumetricScanResult | null;
  isAnalyzing: boolean;
  isStable: boolean;
}

export function LiveResultCard({ result, previousResult, isAnalyzing, isStable }: LiveResultCardProps) {
  const macroTiles = [
    { icon: Flame, label: "kcal", value: result.calories, tone: "text-primary", bg: "bg-primary/10" },
    { icon: Beef, label: "Prot.", value: `${result.macros.protein}g`, tone: "text-protein", bg: "bg-protein/12" },
    { icon: Wheat, label: "Carb.", value: `${result.macros.carbs}g`, tone: "text-carbs", bg: "bg-carbs/15" },
    { icon: FatIcon, label: "Grasa", value: `${result.macros.fat}g`, tone: "text-fat", bg: "bg-fat/15" },
  ];

  return (
    <div className="surface relative w-full max-w-[340px] overflow-hidden p-4">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">Detectado en vivo</p>
            {isAnalyzing && (
              <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                Analizando
              </span>
            )}
            {isStable && !isAnalyzing && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success"
              >
                <CheckCircle2 className="h-3 w-3" />
                Estable
              </motion.span>
            )}
          </div>
          <motion.h3
            key={result.foodName}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="truncate text-base font-semibold leading-tight"
          >
            {result.foodName}
          </motion.h3>
          {previousResult && previousResult.foodName !== result.foodName && (
            <p className="truncate text-xs text-muted-foreground line-through">antes: {previousResult.foodName}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {macroTiles.map((m) => (
          <div key={m.label} className={cn("rounded-xl px-1.5 py-2 text-center", m.bg)}>
            <m.icon className={cn("mx-auto mb-1 h-3.5 w-3.5", m.tone)} />
            <p className="font-display text-sm font-semibold leading-none tabular">{m.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      {(result.aiContext?.containerType || result.aiContext?.estimatedWeightGrams) && (
        <div className="mt-3 flex items-center justify-center gap-3 text-xs text-muted-foreground">
          {result.aiContext?.estimatedWeightGrams && (
            <span className="tabular">≈ {result.aiContext.estimatedWeightGrams} g</span>
          )}
          {result.aiContext?.containerType && (
            <span className="max-w-[160px] truncate">{result.aiContext.containerType}</span>
          )}
        </div>
      )}
    </div>
  );
}
