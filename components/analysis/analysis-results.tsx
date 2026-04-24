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
import { ArrowLeft, Save, Share2, Info } from "lucide-react";
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

  const allMacrosForBars = [
    ...MACRO_MAIN.map((m) => ({
      name: m.name,
      value: result.macros[m.key],
      color: m.color,
      kcal: macroKcal[m.key],
    })),
  ];

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
        toast({
          title: "Análisis compartido",
          description: "El análisis nutricional se compartió exitosamente",
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Análisis copiado",
          description: "El análisis se copió al portapapeles",
        });
      }
    } catch (error) {
      toast({
        title: "Error al compartir",
        description: "No se pudo compartir el análisis nutricional",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-primary-foreground hover:bg-primary-foreground/20 p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold tracking-tight">
              Análisis nutricional
            </h1>
            {showAiBlock && (
              <p className="text-xs opacity-90 truncate">
                Incluye descripción e interpretación del modelo
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={shareAnalysis}
            className="text-primary-foreground hover:bg-primary-foreground/20 p-2 shrink-0"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-6 pb-20">
        {/* Hero: nombre, kcal, foto */}
        <Card className="overflow-hidden border-2 border-primary/10 shadow-sm">
          {imageSrc ? (
            <div className="w-full h-48 sm:h-56 bg-muted">
              <img
                src={imageSrc}
                alt={imageAlt}
                className="w-full h-full object-cover"
              />
            </div>
          ) : null}
          <CardContent className="p-5 sm:p-6 text-center space-y-1">
            <h2 className="text-2xl font-bold text-card-foreground leading-tight">
              {result.foodName}
            </h2>
            <div className="pt-3">
              <div
                className="text-5xl sm:text-6xl font-extrabold text-primary tabular-nums"
                data-testid="calories-hero"
              >
                {result.calories}
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                kcal (estimación por porción)
              </div>
            </div>
            {!imageSrc && (
              <p className="text-xs text-muted-foreground pt-2">
                Análisis a partir de texto; sube una foto en el inicio para más
                contexto visual.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Lo que interpretó la IA */}
        {ctx != null ? (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">Lo que interpretó la IA</CardTitle>
                {(() => {
                  const c = confidenceLabel(ctx.confidence);
                  return (
                    <Badge
                      variant="secondary"
                      className={`text-xs font-semibold ${c.className}`}
                    >
                      Confianza: {c.text}
                    </Badge>
                  );
                })()}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-left">
              <p className="text-sm text-card-foreground leading-relaxed">
                {ctx.dishDescription}
              </p>
              {ctx.cuisineOrStyle != null && ctx.cuisineOrStyle ? (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">Estilo: </span>
                  {ctx.cuisineOrStyle}
                </p>
              ) : null}
              {ctx.cookingClues != null && ctx.cookingClues ? (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">Cocina: </span>
                  {ctx.cookingClues}
                </p>
              ) : null}
              {ctx.ambiguityNotes != null && ctx.ambiguityNotes ? (
                <div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-950 dark:text-amber-100/90">
                  <Info
                    className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                    aria-hidden
                  />
                  <span>
                    <span className="font-medium">Dudas del modelo: </span>
                    {ctx.ambiguityNotes}
                  </span>
                </div>
              ) : null}
              {ctx.visibleComponents.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Componentes visibles o identificados
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ctx.visibleComponents.map((c) => (
                      <Badge key={c} variant="outline" className="text-xs">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                <span className="font-medium text-foreground/80">Porción: </span>
                {ctx.portionLabel}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-muted/40">
            <CardContent className="p-4 flex gap-3 text-sm text-muted-foreground">
              <Info className="h-5 w-5 shrink-0" aria-hidden />
              <p>
                No hay descripción detallada del modelo para este resultado
                (registro antiguo o análisis de respaldo). Los números siguen
                siendo una estimación orientativa.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Distribución de energía (P, C, G) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribución de la energía</CardTitle>
            <p className="text-xs text-muted-foreground font-normal">
              Porcentaje aprox. de calorías que aporta cada macronutriente (P×4, C×4, G×9
              kcal/g).
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
              {MACRO_MAIN.map((m) => {
                const pct = pfcShare(m.key);
                return pct > 0 ? (
                  <div
                    key={m.key}
                    className={`h-full ${m.color}`}
                    style={{ width: `${pct}%` }}
                    title={`${m.name} ~${pct.toFixed(0)}%`}
                  />
                ) : null;
              })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {MACRO_MAIN.map((m) => {
                const pct = pfcShare(m.key);
                return (
                  <div
                    key={m.key}
                    className="flex items-center justify-between gap-2 rounded-md border bg-card px-2 py-1.5"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded ${m.color}`} />
                      {m.name}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Suma aprox. P×4 + C×4 + G×9 + fibra×2:{" "}
              <span className="font-medium text-foreground tabular-nums">
                {fromMacros.toFixed(0)} kcal
              </span>
              {". "}
              Frente a {result.calories} kcal mostradas, la diferencia suele
              deberse al redondeo. La barra de colores de arriba reparte solo P,
              C y G (azúcares van dentro de los carbos en la práctica).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detalle (gramos)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {allMacrosForBars.map((macro) => {
              const percentage =
                totalGramsPfc > 0
                  ? (macro.value / totalGramsPfc) * 100
                  : 0;
              return (
                <div key={macro.name} className="space-y-1.5">
                  <div className="flex justify-between items-baseline text-sm">
                    <span className="font-medium">{macro.name}</span>
                    <span>
                      <span className="font-bold tabular-nums">{macro.value}</span>
                      <span className="text-muted-foreground text-xs ml-1">g</span>
                      {macro.kcal > 0 ? (
                        <span className="text-muted-foreground text-xs ml-2 tabular-nums">
                          ≈{macro.kcal.toFixed(0)} kcal
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${macro.color}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {MACRO_FIBER_SUGAR.map((m, i) => {
              const value = result.macros[m.key];
              return (
                <div
                  key={m.key}
                  className={
                    "flex justify-between text-sm" +
                    (i > 0
                      ? " border-t border-dashed border-border pt-3 mt-1"
                      : "")
                  }
                >
                  <span className="text-muted-foreground font-medium">
                    {m.name}
                  </span>
                  <span className="font-semibold tabular-nums">{value} g</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recomendaciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin sugerencias.</p>
            ) : (
              result.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-0.5 text-xs">
                    {index + 1}
                  </Badge>
                  <p className="text-sm text-card-foreground leading-relaxed">
                    {recommendation}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="sticky bottom-4">
          <Button
            type="button"
            onClick={() => setSaveDialogOpen(true)}
            disabled={isSaving}
            className="w-full h-12 text-lg font-semibold"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Guardar en mi historial
              </>
            )}
          </Button>
        </div>
      </div>

      <AlertDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Guardar en el historial</AlertDialogTitle>
            <AlertDialogDescription>
              Se guardarán el nombre, calorías, macros y, si lo hay, lo que
              interpretó el análisis. ¿Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              onClick={() => {
                setSaveDialogOpen(false);
                void (async () => {
                  try {
                    await Promise.resolve(onSave());
                  } catch (e) {
                    toast({
                      title: "No se pudo guardar",
                      description:
                        e instanceof Error ? e.message : "Intenta de nuevo.",
                      variant: "destructive",
                    });
                  }
                })();
              }}
            >
              Guardar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
