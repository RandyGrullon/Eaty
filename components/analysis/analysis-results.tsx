"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Save, Share2, Info, Camera, Sparkles, Lightbulb, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { macroCaloriesRough } from "@/lib/food-analysis-schema";
import type { FoodAnalysisAiContext } from "@/lib/food-analysis-schema";
import type { Meal } from "@/types/meal";

interface AnalysisResultsProps {
  result: Omit<Meal, "id" | "createdAt">;
  /** Vista previa local (objeto) cuando el análisis vino de una foto y aún no hay `imageUrl` en Firestore. */
  imagePreviewUrl?: string | null;
  onBack: () => void;
  onSave: () => void | Promise<void>;
  isSaving?: boolean;
}

function confidenceLabel(
  c: FoodAnalysisAiContext["confidence"]
): { text: string; className: string } {
  switch (c) {
    case "high":
      return {
        text: "Alta",
        className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      };
    case "medium":
      return {
        text: "Media",
        className: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
      };
    case "low":
    default:
      return {
        text: "Baja",
        className: "bg-muted text-muted-foreground",
      };
  }
}

const MACRO_MAIN = [
  { key: "protein" as const, name: "Proteína", color: "bg-chart-1" },
  { key: "carbs" as const, name: "Carbohidratos", color: "bg-chart-2" },
  { key: "fat" as const, name: "Grasas", color: "bg-chart-4" },
] as const;

const MACRO_FIBER_SUGAR = [
  { key: "fiber" as const, name: "Fibra", color: "bg-chart-3" },
  { key: "sugar" as const, name: "Azúcar", color: "bg-chart-5" },
] as const;

export function AnalysisResults({
  result,
  imagePreviewUrl = null,
  onBack,
  onSave,
  isSaving = false,
}: AnalysisResultsProps) {
  const { toast } = useToast();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const fromMacros = macroCaloriesRough(result.macros);
  const macroKcal = {
    protein: result.macros.protein * 4,
    carbs: result.macros.carbs * 4,
    fat: result.macros.fat * 9,
  };
  const pfcKcal = macroKcal.protein + macroKcal.carbs + macroKcal.fat;
  const pfcShare = (k: keyof typeof macroKcal) =>
    pfcKcal > 0 ? (macroKcal[k] / pfcKcal) * 100 : 0;

  const totalGramsPfc =
    result.macros.protein + result.macros.carbs + result.macros.fat;

  const showAiBlock = result.aiContext != null;
  const ctx = result.aiContext;

  const imageSrc = imagePreviewUrl || result.imageUrl;
  const imageAlt = result.foodName;

  const shareAnalysis = async () => {
    try {
      const aiShort =
        ctx != null
          ? `\n🧠 Lo que interpretó la IA: ${ctx.dishDescription.slice(0, 200)}${
              ctx.dishDescription.length > 200 ? "…" : ""
            }`
          : "";
      const shareText =
        `🍽️ Análisis Nutricional - ${result.foodName}\n\n` +
        `📊 Calorías: ${result.calories} kcal\n` +
        `🥩 Proteínas: ${result.macros.protein} g\n` +
        `🌾 Carbohidratos: ${result.macros.carbs} g\n` +
        `🧈 Grasas: ${result.macros.fat} g\n` +
        `🥦 Fibra: ${result.macros.fiber} g\n` +
        `🍬 Azúcar: ${result.macros.sugar} g` +
        aiShort +
        `\n\nAnalizado con Eaty`;

      if (navigator.share) {
        await navigator.share({
          title: `Análisis de ${result.foodName} - Eaty`,
          text: shareText,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast({ title: "Copiado", description: "El análisis se copió al portapapeles" });
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo compartir", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header flotante */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <h1 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/80">
              Resultados
            </h1>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
              Análisis IA
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={shareAnalysis} className="rounded-xl">
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="mx-auto mt-6 max-w-4xl space-y-8 px-4">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-[2.5rem] border border-border/40 bg-card/40 shadow-2xl shadow-black/[0.03]">
          {imageSrc ? (
            <div className="aspect-video w-full overflow-hidden sm:aspect-[21/9]">
              <img src={imageSrc} alt={imageAlt} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
            </div>
          ) : (
            <div className="flex h-32 w-full items-center justify-center bg-muted/30">
              <Camera className="h-10 w-10 text-muted-foreground/20" />
            </div>
          )}
          <div className="relative p-6 sm:p-8 text-center sm:text-left sm:flex sm:items-end sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                {result.foodName}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {ctx && (
                  <Badge variant="secondary" className={cn("px-3 py-1 font-bold", confidenceLabel(ctx.confidence).className)}>
                    Confianza: {confidenceLabel(ctx.confidence).text}
                  </Badge>
                )}
                <Badge variant="outline" className="px-3 py-1 font-bold bg-background/50">
                  {ctx?.portionLabel || "Porción Estándar"}
                </Badge>
              </div>
            </div>
            <div className="mt-6 sm:mt-0 text-center sm:text-right shrink-0">
              <div className="text-6xl font-black tracking-tighter text-primary tabular-nums">
                {result.calories}
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
                kcal estimadas
              </p>
            </div>
          </div>
        </section>

        {/* Macros Summary Grid */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {MACRO_MAIN.map((m) => {
            const val = result.macros[m.key];
            const kcal = macroKcal[m.key];
            const pct = pfcShare(m.key);
            return (
              <div key={m.key} className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/40 p-6 shadow-xl shadow-black/[0.02] backdrop-blur-sm group">
                <div className={cn("absolute -right-4 -top-4 h-20 w-20 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20", m.color)} />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
                  {m.name}
                </p>
                <div className="mt-3 flex items-baseline gap-2">
                  <p className="text-4xl font-black tracking-tighter tabular-nums">{val}g</p>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <span>{pct.toFixed(0)}% del total</span>
                    <span>{kcal.toFixed(0)} kcal</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted shadow-inner">
                    <div className={cn("h-full rounded-full shadow-lg", m.color)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Interpretación IA */}
          <div className="lg:col-span-7 space-y-8">
            {ctx ? (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-black tracking-tight text-foreground">Análisis Detallado</h3>
                </div>
                <div className="rounded-[2rem] border border-border/40 bg-card/40 p-6 shadow-sm backdrop-blur-sm space-y-4">
                  <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                    {ctx.dishDescription}
                  </p>
                  
                  {ctx.ambiguityNotes && (
                    <div className="flex gap-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4">
                      <Info className="h-5 w-5 text-amber-500 shrink-0" />
                      <p className="text-xs font-medium text-amber-700/80 dark:text-amber-400/80 leading-snug">
                        {ctx.ambiguityNotes}
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-border/40">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-3">Componentes identificados</p>
                    <div className="flex flex-wrap gap-2">
                      {ctx.visibleComponents.map((c) => (
                        <span key={c} className="px-3 py-1 rounded-full bg-accent/50 border border-border/40 text-[10px] font-bold text-foreground/80">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <div className="rounded-[2rem] border-2 border-dashed border-border/40 p-8 text-center">
                <p className="text-sm font-medium text-muted-foreground/60">Análisis básico sin contexto IA avanzado.</p>
              </div>
            )}

            {/* Recomendaciones */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-chart-2" />
                <h3 className="text-lg font-black tracking-tight text-foreground">Consejos de Salud</h3>
              </div>
              <div className="grid gap-3">
                {result.recommendations.map((rec, i) => (
                  <div key={i} className="flex gap-4 items-start rounded-2xl border border-border/40 bg-card/40 p-4 transition-colors hover:bg-card">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-black text-primary">
                      {i + 1}
                    </span>
                    <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                      {rec}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Otros Detalles Macros */}
          <div className="lg:col-span-5">
            <section className="space-y-4">
              <h3 className="text-lg font-black tracking-tight text-foreground">Otros Detalles</h3>
              <div className="rounded-[2rem] border border-border/40 bg-card/40 p-6 shadow-sm backdrop-blur-sm space-y-6">
                {MACRO_FIBER_SUGAR.map((m) => (
                  <div key={m.key} className="group">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">{m.name}</span>
                      <span className="text-lg font-black tabular-nums">{result.macros[m.key]}g</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted shadow-inner overflow-hidden">
                      <div className={cn("h-full rounded-full opacity-60", m.color)} style={{ width: `${Math.min((result.macros[m.key]/20)*100, 100)}%` }} />
                    </div>
                  </div>
                ))}

                <div className="pt-6 border-t border-border/40">
                  <div className="flex items-start gap-3 rounded-2xl bg-muted/30 p-4 text-[10px] font-medium text-muted-foreground/80 leading-relaxed">
                    <Info className="h-4 w-4 shrink-0 text-primary/40" />
                    <p>
                      La suma técnica es de <span className="font-bold text-foreground">{fromMacros.toFixed(0)} kcal</span>. 
                      La diferencia con las {result.calories} kcal mostradas es normal debido al redondeo nutricional estándar.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Botón de Guardar flotante */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-8 bg-gradient-to-t from-background via-background/95 to-transparent flex justify-center sm:pb-4">
        <div className="w-full max-w-4xl">
          <Button
            type="button"
            onClick={() => setSaveDialogOpen(true)}
            disabled={isSaving}
            className="w-full h-14 rounded-2xl text-lg font-black shadow-2xl shadow-primary/30 transition-all active:scale-95"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Save className="mr-2 h-5 w-5" />
            )}
            {isSaving ? "Guardando..." : "Registrar Comida"}
          </Button>
        </div>
      </div>

      <AlertDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black">¿Registrar comida?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium">
              Este análisis se guardará en tu historial personal para el seguimiento de tus metas diarias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
            <Button
              type="button"
              className="rounded-xl font-black"
              onClick={() => {
                setSaveDialogOpen(false);
                void onSave();
              }}
            >
              Confirmar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
