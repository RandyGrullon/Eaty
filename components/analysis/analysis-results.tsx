"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft, Save, Share2, Info, Camera, Sparkles, Lightbulb, Loader2, Edit3, Heart, Zap, Coffee, Smile, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { macroCaloriesRough } from "@/lib/food-analysis-schema";
import type { Meal } from "@/types/meal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { toDateInputValue, fromDateInputValue } from "@/lib/date-format";
import { confidenceLabel } from "@/lib/confidence";
import { GenerateDishImage } from "@/components/meal/generate-dish-image";
import { MealThumb } from "@/components/meal/meal-thumb";

interface AnalysisResultsProps {
  result: Omit<Meal, "id" | "createdAt">;
  /** Vista previa local (objeto) cuando el análisis vino de una foto y aún no hay `imageUrl` en Firestore. */
  imagePreviewUrl?: string | null;
  onBack: () => void;
  onSave: (editedData: Omit<Meal, "id" | "createdAt">) => void | Promise<void>;
  onSavePlanned?: (data: Omit<Meal, "id" | "createdAt">, date: Date) => void | Promise<void>;
  isSaving?: boolean;
  /** Día preseleccionado desde el planificador: prerellena el diálogo "Planear". */
  defaultPlannedDate?: Date | null;
}

// Colores fijos por macro (clases literales para que Tailwind las detecte).
const MACRO_MAIN = [
  { key: "protein" as const, label: "Proteína", dot: "bg-protein", bar: "bg-protein", track: "bg-protein/15" },
  { key: "carbs" as const, label: "Carbohidratos", dot: "bg-carbs", bar: "bg-carbs", track: "bg-carbs/20" },
  { key: "fat" as const, label: "Grasa", dot: "bg-fat", bar: "bg-fat", track: "bg-fat/15" },
] as const;

const MACRO_FIBER_SUGAR = [
  { key: "fiber" as const, label: "Fibra", bar: "bg-primary", track: "bg-primary/15" },
  { key: "sugar" as const, label: "Azúcar", bar: "bg-chart-5", track: "bg-muted" },
] as const;

const MOODS = [
  { id: "energetic" as const, label: "Con energía", icon: Zap, tone: "bg-carbs/20 text-foreground" },
  { id: "satisfied" as const, label: "Satisfecho", icon: Smile, tone: "bg-primary/10 text-primary" },
  { id: "neutral" as const, label: "Normal", icon: Coffee, tone: "bg-fat/15 text-fat" },
  { id: "heavy" as const, label: "Pesado", icon: Info, tone: "bg-protein/12 text-protein" },
];

const CONFIDENCE_TONE: Record<string, string> = {
  high: "bg-success/15 text-success hover:bg-success/15",
  medium: "bg-warning/20 text-foreground hover:bg-warning/20",
  low: "bg-muted text-muted-foreground hover:bg-muted",
};

export function AnalysisResults({
  result: initialResult,
  imagePreviewUrl = null,
  onBack,
  onSave,
  isSaving = false,
  defaultPlannedDate = null,
}: AnalysisResultsProps) {
  const { toast } = useToast();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [recordedAt, setRecordedAt] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [plannedDate, setPlannedDate] = useState<Date>(
    defaultPlannedDate ?? new Date()
  );
  const [editedResult, setEditedResult] = useState(initialResult);

  // ¿Venimos del planificador con un día ya elegido? En ese caso se guarda
  // directamente en esa fecha (sin elegir fecha ni "Registrar hoy").
  const fromPlanner = defaultPlannedDate != null;
  const plannedIsToday =
    plannedDate.toDateString() === new Date().toDateString();
  const plannedLabel = plannedIsToday
    ? "hoy"
    : plannedDate.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
  // Versión corta para el botón (evita desbordes en móvil): "vie 6 jun".
  const plannedShort = plannedIsToday
    ? "hoy"
    : plannedDate.toLocaleDateString("es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });

  const handleSavePlanned = () => {
    void onSave({ ...editedResult, isPlanned: true, plannedDate } as any);
  };

  const fromMacros = macroCaloriesRough(editedResult.macros);
  const macroKcal = {
    protein: editedResult.macros.protein * 4,
    carbs: editedResult.macros.carbs * 4,
    fat: editedResult.macros.fat * 9,
  };
  const pfcKcal = macroKcal.protein + macroKcal.carbs + macroKcal.fat;
  const pfcShare = (k: keyof typeof macroKcal) =>
    pfcKcal > 0 ? (macroKcal[k] / pfcKcal) * 100 : 0;

  const showAiBlock = editedResult.aiContext != null;
  const ctx = editedResult.aiContext;

  const imageSrc = imagePreviewUrl || editedResult.imageUrl;
  const imageAlt = editedResult.foodName;

  const handleMacroChange = (key: keyof typeof editedResult.macros, val: string) => {
    const num = parseFloat(val) || 0;
    setEditedResult(prev => ({
      ...prev,
      macros: { ...prev.macros, [key]: num }
    }));
  };

  const handleMoodSelect = (mood: Meal["mood"]) => {
    setEditedResult(prev => ({ ...prev, mood }));
  };

  const shareAnalysis = async () => {
    try {
      const aiShort =
        ctx != null
          ? `\nLo que interpretó la IA: ${ctx.dishDescription.slice(0, 200)}${
              ctx.dishDescription.length > 200 ? "…" : ""
            }`
          : "";
      const shareText =
        `Análisis nutricional: ${editedResult.foodName}\n\n` +
        `Calorías: ${editedResult.calories} kcal\n` +
        `Proteínas: ${editedResult.macros.protein} g\n` +
        `Carbohidratos: ${editedResult.macros.carbs} g\n` +
        `Grasas: ${editedResult.macros.fat} g\n` +
        aiShort +
        `\n\nAnalizado con Eaty`;

      if (navigator.share) {
        await navigator.share({
          title: `Análisis de ${editedResult.foodName} - Eaty`,
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
    <div className="min-h-screen bg-background pb-36">
      {/* Cabecera */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full" aria-label="Volver">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 text-center">
            <h1 className="truncate text-lg font-bold">Resultado</h1>
            <p className="text-xs text-muted-foreground">Análisis con IA</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={shareAnalysis}
            className="rounded-full"
            aria-label="Compartir análisis"
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="mx-auto mt-6 max-w-4xl space-y-6 px-4 sm:px-6 lg:px-10">
        {fromPlanner && (
          <div className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
            <Calendar className="h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm">
              Planificando para <span className="font-semibold capitalize text-primary">{plannedLabel}</span>. Se
              guardará directamente en ese día.
            </p>
          </div>
        )}

        {/* Plato */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="surface overflow-hidden"
        >
          {imageSrc ? (
            <MealThumb src={imageSrc} alt={imageAlt} className="aspect-video w-full sm:aspect-[21/9]" iconClassName="h-8 w-8" />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 bg-muted/60 px-6 py-8">
              <Camera className="h-8 w-8 text-muted-foreground/60" />
              <GenerateDishImage
                meal={{ foodName: editedResult.foodName, aiContext: editedResult.aiContext }}
                onUseImage={(url) => setEditedResult((prev) => ({ ...prev, imageUrl: url }))}
                className="w-full max-w-xs"
              />
            </div>
          )}
          <div className="space-y-5 p-5 sm:flex sm:items-end sm:justify-between sm:gap-6 sm:space-y-0 sm:p-6">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="foodName" className="eyebrow">
                  Nombre del plato
                </Label>
                <div className="group relative">
                  <Input
                    id="foodName"
                    value={editedResult.foodName}
                    onChange={(e) => setEditedResult((prev) => ({ ...prev, foodName: e.target.value }))}
                    className="h-12 rounded-xl pr-10 font-display text-lg font-semibold"
                  />
                  <Edit3 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60 transition-colors group-focus-within:text-primary" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {ctx && (
                  <Badge className={cn("rounded-full px-3 py-1 font-medium", CONFIDENCE_TONE[ctx.confidence] ?? CONFIDENCE_TONE.low)}>
                    Confianza {confidenceLabel(ctx.confidence).text.toLowerCase()}
                  </Badge>
                )}
                <Badge variant="outline" className="rounded-full px-3 py-1 font-medium">
                  {ctx?.portionLabel || "Porción estándar"}
                </Badge>
              </div>
            </div>
            <div className="shrink-0 rounded-xl bg-muted/60 px-4 py-3 sm:min-w-40 sm:text-right">
              <Label htmlFor="calories" className="eyebrow">
                Calorías totales
              </Label>
              <div className="flex items-baseline gap-1.5 sm:justify-end">
                <Input
                  id="calories"
                  type="number"
                  value={editedResult.calories}
                  onChange={(e) =>
                    setEditedResult((prev) => ({ ...prev, calories: parseInt(e.target.value) || 0 }))
                  }
                  className="h-12 w-auto min-w-[2ch] max-w-[6ch] border-none bg-transparent p-0 font-display text-4xl font-bold text-primary tabular shadow-none [field-sizing:content] focus-visible:ring-0 sm:text-right dark:bg-transparent"
                />
                <span className="text-sm text-muted-foreground">kcal</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Macros */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {MACRO_MAIN.map((m, i) => {
            const val = editedResult.macros[m.key];
            const kcal = macroKcal[m.key];
            const pct = pfcShare(m.key);
            return (
              <div key={m.key} className="surface p-5">
                <Label htmlFor={`macro-${m.key}`} className="flex items-center gap-2 text-sm font-medium">
                  <span className={cn("h-2 w-2 rounded-full", m.dot)} aria-hidden />
                  {m.label}
                </Label>
                <div className="mt-2 flex items-baseline gap-1">
                  <Input
                    id={`macro-${m.key}`}
                    type="number"
                    value={val}
                    onChange={(e) => handleMacroChange(m.key, e.target.value)}
                    className="h-10 w-auto min-w-[2ch] max-w-[5ch] border-none bg-transparent p-0 font-display text-3xl font-bold tabular shadow-none [field-sizing:content] focus-visible:ring-0 dark:bg-transparent"
                  />
                  <span className="text-sm text-muted-foreground">g</span>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground tabular">
                    <span>{pct.toFixed(0)}% de la energía</span>
                    <span>{kcal.toFixed(0)} kcal</span>
                  </div>
                  <div className={cn("h-2 w-full overflow-hidden rounded-full", m.track)}>
                    <motion.div
                      className={cn("h-full rounded-full", m.bar)}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.9, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Estado de ánimo */}
        <section className="surface p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Heart className="h-4 w-4 text-protein" />
            ¿Cómo te sientes tras comer?
          </h3>
          <div role="radiogroup" aria-label="Cómo te sientes" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MOODS.map((m) => {
              const selected = editedResult.mood === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleMoodSelect(m.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border p-3 text-left text-sm font-medium transition-colors",
                    selected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      selected ? m.tone : "bg-muted text-muted-foreground"
                    )}
                  >
                    <m.icon className="h-4 w-4" />
                  </span>
                  {m.label}
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Interpretación IA y consejos */}
          <div className="space-y-6 lg:col-span-7">
            {ctx ? (
              <section className="surface p-5 sm:p-6">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Lo que ve la IA
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{ctx.dishDescription}</p>

                {ctx.ambiguityNotes && (
                  <div className="mt-4 flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground dark:text-warning" />
                    <p className="text-sm leading-snug">{ctx.ambiguityNotes}</p>
                  </div>
                )}

                {ctx.visibleComponents.length > 0 && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="eyebrow mb-2">Componentes identificados</p>
                    <div className="flex flex-wrap gap-2">
                      {ctx.visibleComponents.map((c) => (
                        <span
                          key={c}
                          className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center">
                <Sparkles className="mx-auto h-6 w-6 text-muted-foreground/60" />
                <p className="mt-2 text-sm text-muted-foreground">Análisis básico, sin contexto detallado de la IA.</p>
              </div>
            )}

            {editedResult.recommendations.length > 0 && (
              <section className="surface p-5 sm:p-6">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Consejos
                </h3>
                <ol className="mt-3 space-y-2">
                  {editedResult.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary tabular">
                        {i + 1}
                      </span>
                      <p className="text-sm leading-relaxed">{rec}</p>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>

          {/* Otros detalles */}
          <div className="lg:col-span-5">
            <section className="surface space-y-4 p-5 sm:p-6">
              <h3 className="text-base font-semibold">Otros detalles</h3>
              {MACRO_FIBER_SUGAR.map((m) => (
                <div key={m.key}>
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <span className={cn("h-2 w-2 rounded-full", m.bar)} aria-hidden />
                      {m.label}
                    </span>
                    <span className="font-semibold tabular">{editedResult.macros[m.key]} g</span>
                  </div>
                  <div className={cn("h-2 w-full overflow-hidden rounded-full", m.track)}>
                    <div
                      className={cn("h-full rounded-full", m.bar)}
                      style={{
                        width: `${Math.min(((editedResult.macros[m.key] as number) / 20) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}

              <p className="flex items-start gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
                <Info className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>
                  La suma de macros da <span className="font-semibold text-foreground tabular">{fromMacros.toFixed(0)} kcal</span>.
                  La diferencia con las {editedResult.calories} kcal mostradas es normal por el redondeo nutricional.
                </span>
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Barra de guardado */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex w-full max-w-4xl gap-3">
          {fromPlanner ? (
            // Venimos del planificador: guardado directo en la fecha elegida.
            <Button
              type="button"
              onClick={handleSavePlanned}
              disabled={isSaving}
              className="h-12 min-w-0 flex-1 gap-2 rounded-full text-base"
            >
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Calendar className="h-5 w-5" />}
              <span className="truncate">{isSaving ? "Guardando…" : `Guardar para ${plannedShort}`}</span>
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPlanDialogOpen(true)}
                disabled={isSaving}
                className="h-12 min-w-0 flex-1 gap-2 rounded-full text-base"
              >
                <Calendar className="h-5 w-5" />
                Planear
              </Button>
              <Button
                type="button"
                onClick={() => setSaveDialogOpen(true)}
                disabled={isSaving}
                className="h-12 min-w-0 flex-[2] gap-2 rounded-full text-base"
              >
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                {isSaving ? "Guardando…" : "Registrar hoy"}
              </Button>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">¿Registrar comida?</AlertDialogTitle>
            <AlertDialogDescription>
              Se guardará en tu historial para el seguimiento de tus metas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="recorded-at" className="font-medium">
              Fecha y hora del registro
            </Label>
            <Input
              id="recorded-at"
              type="datetime-local"
              className="h-11 rounded-xl tabular"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
            />
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
            <Button
              type="button"
              className="rounded-full"
              onClick={() => {
                setSaveDialogOpen(false);
                const parsedDate = recordedAt ? new Date(recordedAt) : null;
                const validDate =
                  parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : undefined;
                void onSave({
                  ...editedResult,
                  ...(validDate ? { recordedAt: validDate } : {}),
                } as any);
              }}
            >
              Registrar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Planificar comida</AlertDialogTitle>
            <AlertDialogDescription>Elige un día para añadir esta comida a tu plan semanal.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="planned-date" className="font-medium">
              Fecha
            </Label>
            <Input
              id="planned-date"
              type="date"
              className="h-11 rounded-xl tabular"
              min={toDateInputValue(new Date())}
              value={toDateInputValue(plannedDate)}
              onChange={(e) => {
                if (e.target.value) setPlannedDate(fromDateInputValue(e.target.value));
              }}
            />
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
            <Button
              type="button"
              className="rounded-full"
              onClick={() => {
                setPlanDialogOpen(false);
                // onSave en app/page.tsx ya maneja el objeto expandido (isPlanned + plannedDate).
                void onSave({ ...editedResult, isPlanned: true, plannedDate } as any);
              }}
            >
              Añadir al plan
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
