"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Type, ClipboardPaste, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface TextAnalysisCardProps {
  foodName: string;
  onFoodNameChange: (value: string) => void;
  onAnalyze: () => void;
  onPaste: () => void;
  pasteLoading: boolean;
}

export function TextAnalysisCard({
  foodName,
  onFoodNameChange,
  onAnalyze,
  onPaste,
  pasteLoading,
}: TextAnalysisCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="surface space-y-4 p-5 sm:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Type className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <Label htmlFor="scan-food-name" className="text-base font-semibold">
            Escribe el plato
          </Label>
          <p className="text-sm text-muted-foreground">Cuantas más pistas, mejor la estimación.</p>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-stretch sm:gap-2">
        <Input
          id="scan-food-name"
          placeholder="Ej. ensalada César con pollo a la plancha…"
          value={foodName}
          onChange={(e) => onFoodNameChange(e.target.value)}
          className="h-11 w-full min-w-0 flex-1 rounded-xl text-base sm:text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAnalyze();
            }
          }}
        />
        <div className="flex gap-2 sm:shrink-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full"
            onClick={onPaste}
            disabled={pasteLoading}
            title="Pegar imagen o texto del portapapeles"
            aria-label="Pegar del portapapeles"
          >
            {pasteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardPaste className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            onClick={onAnalyze}
            disabled={!foodName.trim()}
            className="h-11 flex-1 rounded-full px-5 sm:flex-none"
            aria-label="Analizar por texto"
          >
            <Sparkles className="h-4 w-4" />
            Analizar
          </Button>
        </div>
      </div>
    </motion.section>
  );
}
