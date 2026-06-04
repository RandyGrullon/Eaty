"use client";

import {
  Flame,
  Beef,
  Wheat,
  Droplets as FatIcon,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { VolumetricScanResult } from "@/lib/scan/frame-utils";

interface LiveResultCardProps {
  result: VolumetricScanResult;
  previousResult: VolumetricScanResult | null;
  isAnalyzing: boolean;
  isStable: boolean;
}

export function LiveResultCard({
  result,
  previousResult,
  isAnalyzing,
  isStable,
}: LiveResultCardProps) {
  const macroTiles = [
    { icon: Flame, label: "kcal", value: result.calories, colorTxt: "text-orange-400", bg: "bg-orange-500/10" },
    { icon: Beef, label: "P", value: `${result.macros.protein}g`, colorTxt: "text-red-400", bg: "bg-red-400/10" },
    { icon: Wheat, label: "C", value: `${result.macros.carbs}g`, colorTxt: "text-amber-400", bg: "bg-amber-400/10" },
    { icon: FatIcon, label: "G", value: `${result.macros.fat}g`, colorTxt: "text-yellow-400", bg: "bg-yellow-400/10" },
  ];

  return (
    <div className="relative w-full max-w-[330px]">
      <div className={cn(
        "absolute inset-0 blur-[60px] rounded-full transition-colors",
        isStable ? "bg-emerald-500/20" : "bg-emerald-500/10"
      )} />
      <div className="relative bg-black/55 backdrop-blur-3xl border border-white/15 rounded-[2rem] p-5 shadow-2xl overflow-hidden">
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {isAnalyzing && (
            <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-400/30 rounded-full px-2 py-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[8px] font-black uppercase tracking-[0.15em] text-emerald-300">LIVE</span>
            </div>
          )}
          {isStable && !isAnalyzing && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-400/40 rounded-full px-2 py-0.5"
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-300" />
              <span className="text-[8px] font-black uppercase tracking-[0.15em] text-emerald-300">ESTABLE</span>
            </motion.div>
          )}
        </div>

        <div className="flex items-start gap-2 mb-3">
          <div className="bg-emerald-500/20 p-1.5 rounded-lg border border-emerald-500/30 shrink-0">
            <Sparkles className="h-3 w-3 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-emerald-400/80 mb-0.5">
              Detectado en vivo
            </p>
            <motion.h3
              key={result.foodName}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-base font-black text-white leading-tight truncate"
            >
              {result.foodName}
            </motion.h3>
            {previousResult && previousResult.foodName !== result.foodName && (
              <p className="text-[9px] text-white/40 line-through truncate">
                antes: {previousResult.foodName}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {macroTiles.map((m, i) => (
            <div key={i} className={cn("rounded-xl p-2 border border-white/5 text-center", m.bg)}>
              <m.icon className={cn("h-3 w-3 mx-auto mb-1", m.colorTxt)} />
              <p className="text-xs font-black text-white leading-none">{m.value}</p>
              <p className="text-[8px] font-bold text-white/40 uppercase tracking-wider mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>

        {(result.aiContext?.containerType || result.aiContext?.estimatedWeightGrams) && (
          <div className="mt-3 flex items-center justify-center gap-3 text-[9px] font-bold text-white/40 uppercase tracking-wider">
            {result.aiContext?.estimatedWeightGrams && (
              <span>≈ {result.aiContext.estimatedWeightGrams}g</span>
            )}
            {result.aiContext?.containerType && (
              <span className="truncate max-w-[160px]">{result.aiContext.containerType}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
