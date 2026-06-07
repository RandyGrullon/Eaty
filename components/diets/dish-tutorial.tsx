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
import { cn } from "@/lib/utils";
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
          <DrawerHeader className="shrink-0 border-b pb-4 text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              Tutorial paso a paso
            </p>
            <DrawerTitle className="text-2xl font-black tracking-tight">
              {dish?.name ?? "Plato"}
            </DrawerTitle>
          </DrawerHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {!dish ? null : !tutorial ? (
              <div className="rounded-2xl border border-dashed border-border/50 bg-muted/20 p-8 text-center">
                <ChefHat className="mx-auto mb-3 h-10 w-10 text-primary/50" />
                <p className="mb-5 text-sm font-medium text-muted-foreground">
                  Aún no hay tutorial para este plato. Genera uno paso a paso,
                  extremadamente detallado, con la IA.
                </p>
                <Button
                  className="rounded-xl font-black shadow-lg shadow-primary/20"
                  onClick={generate}
                  disabled={loading || !user}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {loading ? "Creando tutorial…" : "Generar tutorial"}
                </Button>
              </div>
            ) : (
              <div className="space-y-7">
                {/* Meta */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MetaTile icon={Users} label="Raciones" value={`${tutorial.servings}`} />
                  <MetaTile
                    icon={Clock}
                    label="Prep + cocción"
                    value={`${tutorial.prepTimeMin + tutorial.cookTimeMin} min`}
                  />
                  <MetaTile
                    icon={Flame}
                    label="Dificultad"
                    value={DIFFICULTY_LABEL[tutorial.difficulty]}
                  />
                  <MetaTile
                    icon={UtensilsCrossed}
                    label="Pasos"
                    value={`${tutorial.steps.length}`}
                  />
                </div>

                {/* Equipo */}
                {tutorial.equipment.length > 0 && (
                  <section>
                    <SectionTitle icon={ChefHat}>Utensilios</SectionTitle>
                    <div className="flex flex-wrap gap-2">
                      {tutorial.equipment.map((e, i) => (
                        <span
                          key={i}
                          className="rounded-full border border-border/40 bg-card/50 px-3 py-1 text-xs font-medium"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Ingredientes */}
                <section>
                  <SectionTitle icon={UtensilsCrossed}>Ingredientes</SectionTitle>
                  <div className="overflow-hidden rounded-2xl border border-border/40">
                    {tutorial.ingredients.map((ing, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center justify-between gap-3 px-4 py-2.5 text-sm",
                          i % 2 === 0 ? "bg-card/40" : "bg-transparent"
                        )}
                      >
                        <span className="font-medium text-foreground">{ing.item}</span>
                        <span className="shrink-0 font-bold tabular-nums text-primary">
                          {ing.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Pasos */}
                <section>
                  <SectionTitle icon={ChefHat}>Paso a paso</SectionTitle>
                  <div className="space-y-3">
                    {tutorial.steps.map((step) => (
                      <div
                        key={step.n}
                        className="rounded-2xl border border-border/40 bg-card/40 p-4"
                      >
                        <div className="mb-1 flex items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-black text-primary-foreground">
                            {step.n}
                          </span>
                          <h4 className="text-sm font-black text-foreground">
                            {step.title}
                          </h4>
                        </div>
                        <p className="ml-10 text-sm leading-relaxed text-muted-foreground">
                          {step.detail}
                        </p>
                        <div className="ml-10 mt-2 flex flex-wrap gap-3 text-[11px] font-bold">
                          {step.durationMin ? (
                            <span className="flex items-center gap-1 text-chart-2">
                              <Clock className="h-3 w-3" />
                              {step.durationMin} min
                            </span>
                          ) : null}
                          {step.tempC ? (
                            <span className="flex items-center gap-1 text-chart-4">
                              <Thermometer className="h-3 w-3" />
                              {step.tempC} °C
                            </span>
                          ) : null}
                        </div>
                        {step.tip ? (
                          <div className="ml-10 mt-2 flex items-start gap-2 rounded-xl bg-primary/5 p-2.5 text-xs text-foreground/80">
                            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                            <span>{step.tip}</span>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Errores comunes */}
                {tutorial.commonMistakes.length > 0 && (
                  <section>
                    <SectionTitle icon={AlertTriangle}>Errores a evitar</SectionTitle>
                    <ul className="space-y-2">
                      {tutorial.commonMistakes.map((m, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-foreground/80"
                        >
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
                    <p className="rounded-2xl border border-border/40 bg-card/40 p-4 text-sm leading-relaxed text-muted-foreground">
                      {tutorial.plating}
                    </p>
                  </section>
                ) : null}

                <Button
                  variant="outline"
                  className="w-full rounded-xl font-bold"
                  onClick={generate}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
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

function MetaTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 p-3 text-center">
      <Icon className="mx-auto mb-1 h-4 w-4 text-primary" />
      <p className="text-sm font-black tabular-nums">{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">
        {label}
      </p>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof Clock;
  children: React.ReactNode;
}) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-lg font-black tracking-tight text-foreground">
      <Icon className="h-5 w-5 text-primary" />
      {children}
    </h3>
  );
}
