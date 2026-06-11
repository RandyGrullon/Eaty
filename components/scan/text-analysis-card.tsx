"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-b from-card to-card/80 shadow-lg shadow-primary/5">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Type className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <Label htmlFor="scan-food-name" className="text-base font-semibold text-foreground">
                  Escribe el plato
                </Label>
                <p className="text-xs text-muted-foreground">
                  Cuantas más pistas, mejor la estimación.
                </p>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-stretch sm:gap-2">
            <Input
              id="scan-food-name"
              placeholder="Ej. ensalada César con pollo a la plancha…"
              value={foodName}
              onChange={(e) => onFoodNameChange(e.target.value)}
              className="h-12 w-full min-w-0 flex-1 rounded-xl border-border/80 bg-background/50 text-base sm:min-w-0 sm:text-sm"
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
                className="h-12 w-12 rounded-xl border-primary/25 bg-background"
                onClick={onPaste}
                disabled={pasteLoading}
                title="Pegar imagen o texto del portapapeles"
                aria-label="Pegar del portapapeles"
              >
                {pasteLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardPaste className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                onClick={onAnalyze}
                disabled={!foodName.trim()}
                className="h-12 min-w-[6.5rem] rounded-xl px-5"
                aria-label="Analizar por texto"
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                Analizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
