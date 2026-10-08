"use client";

import { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Sparkles,
  Clock,
  Flame,
  Users,
  ChefHat,
  Lightbulb,
  AlertTriangle,
  UtensilsCrossed,
  Thermometer,
} from "lucide-react";
import { useAppData } from "@/hooks/use-app-data";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { generateTutorialApi } from "@/lib/diets";
import { logger } from "@/lib/logger";
import {
  DIFFICULTY_LABEL,
  type Diet,
  type DietDish,
  type DishTutorial,
} from "@/types/diet";

export function DishTutorialDrawer({
  diet,
  dish,
  open,
  onOpenChange,
}: {
  diet: Diet;
  dish: DietDish | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { profile, saveDishTutorial } = useAppData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [local, setLocal] = useState<DishTutorial | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLocal(null);
  }, [dish?.id]);

  const tutorial = local ?? dish?.tutorial ?? null;

  const generate = async () => {
    if (!user || !dish) return;
    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const t = await generateTutorialApi(idToken, {
        dishName: dish.name,
        description: dish.description || undefined,
        lang: profile?.language,
      });
      setLocal(t);
      // Persistir en la dieta para reutilizar (tiempo real).
      try {
        await saveDishTutorial(diet, dish.id, t);
      } catch (e) {
        logger.error("persist tutorial", e);
      }
    } catch (e) {
      logger.error("generate tutorial", e);
      toast({
        title: "No se pudo generar el tutorial",
        description: "Inténtalo de nuevo en un momento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <div className="mx-auto flex h-[88vh] w-full max-w-2xl flex-col overflow-hidden">
          <DrawerHeader className="shrink-0 border-b border-border pb-4 text-left">
            <p className="eyebrow">Tutorial paso a paso</p>
            <DrawerTitle className="text-2xl font-bold">{dish?.name ?? "Plato"}</DrawerTitle>
          </DrawerHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-5">
            {!dish ? null : !tutorial ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center">
                <ChefHat className="mx-auto h-8 w-8 text-muted-foreground/60" />
                <p className="mt-3 font-semibold">Sin tutorial todavía</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                  Genera con IA una receta paso a paso, bien detallada.
                </p>
                <Button className="mt-4 h-11 rounded-full px-6" onClick={generate} disabled={loading || !user}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? "Creando tutorial…" : "Generar tutorial"}
                </Button>
              </div>
            ) : (
              <div className="space-y-7">
                {/* Meta */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MetaTile icon={Users} label="Raciones" value={`${tutorial.servings}`} />
                  <MetaTile
                    icon={Clock}
                    label="Prep + cocción"
                    value={`${tutorial.prepTimeMin + tutorial.cookTimeMin} min`}
                  />
                  <MetaTile icon={Flame} label="Dificultad" value={DIFFICULTY_LABEL[tutorial.difficulty]} />
                  <MetaTile icon={UtensilsCrossed} label="Pasos" value={`${tutorial.steps.length}`} />
                </div>

                {/* Equipo */}
                {tutorial.equipment.length > 0 && (
                  <section>
                    <SectionTitle icon={ChefHat}>Utensilios</SectionTitle>
                    <div className="flex flex-wrap gap-1.5">
                      {tutorial.equipment.map((e, i) => (
                        <span key={i} className="rounded-full bg-muted px-3 py-1 text-sm">
                          {e}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Ingredientes */}
                <section>
                  <SectionTitle icon={UtensilsCrossed}>Ingredientes</SectionTitle>
                  <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                    {tutorial.ingredients.map((ing, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                        <span className="min-w-0 font-medium">{ing.item}</span>
                        <span className="shrink-0 text-right font-semibold tabular text-primary">{ing.amount}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Pasos */}
                <section>
                  <SectionTitle icon={ChefHat}>Paso a paso</SectionTitle>
                  <ol className="space-y-2.5">
                    {tutorial.steps.map((step) => (
                      <li key={step.n} className="rounded-2xl border border-border bg-card p-4">
                        <div className="flex items-start gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold tabular text-primary-foreground">
                            {step.n}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-semibold">{step.title}</h4>
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
                            {step.durationMin || step.tempC ? (
                              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                {step.durationMin ? (
                                  <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 tabular text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {step.durationMin} min
                                  </span>
                                ) : null}
                                {step.tempC ? (
                                  <span className="flex items-center gap-1 rounded-full bg-protein/12 px-2 py-0.5 tabular text-protein">
                                    <Thermometer className="h-3 w-3" />
                                    {step.tempC} °C
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                            {step.tip ? (
                              <div className="mt-2 flex items-start gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-xs">
                                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                                <span>{step.tip}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

                {/* Errores comunes */}
                {tutorial.commonMistakes.length > 0 && (
                  <section>
                    <SectionTitle icon={AlertTriangle}>Errores a evitar</SectionTitle>
                    <ul className="space-y-2">
                      {tutorial.commonMistakes.map((m, i) => (
                        <li key={i} className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Emplatado */}
                {tutorial.plating ? (
                  <section>
                    <SectionTitle icon={Sparkles}>Emplatado</SectionTitle>
                    <p className="rounded-xl bg-muted/60 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                      {tutorial.plating}
                    </p>
                  </section>
                ) : null}

                <Button variant="outline" className="h-11 w-full rounded-full" onClick={generate} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Regenerar tutorial
                </Button>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function MetaTile({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-muted/60 px-3 py-2.5 text-center">
      <Icon className="mx-auto mb-1 h-4 w-4 text-primary" />
      <p className="truncate font-display text-base font-semibold tabular">{value}</p>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      {children}
    </h3>
  );
}
