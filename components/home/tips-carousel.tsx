"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Lightbulb,
  Loader2,
  Heart,
  Share2,
  Play,
  Pause,
  ChefHat,
  MapPin,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { generateNutritionTips } from "@/lib/groq";
import { GroqApiError } from "@/lib/groq-api-error";
import { logger } from "@/lib/logger";
import { getUserMeals, getTodayStats } from "@/lib/meals";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PersonalizedNutritionTip } from "@/lib/food-analysis-schema";
import {
  STATIC_TIPS_ERROR,
  STATIC_TIPS_NO_MEALS,
} from "@/lib/nutrition-tip-defaults";
import { buildRecipeSearchLinks } from "@/lib/nutrition-tip-recipes";

function formatTipForShare(tip: PersonalizedNutritionTip): string {
  const lines = [
    `🔧 Qué cambiar: ${tip.whatToChange}`,
    `📍 Dónde aplicarlo: ${tip.whereApply}`,
    ...(tip.whyItHelps ? [`💡 Por qué ayuda: ${tip.whyItHelps}`] : []),
    `🔎 Buscar recetas: ${tip.recipeSearchQuery}`,
    "",
    "Pasos:",
    ...tip.miniSteps.map((s, i) => `${i + 1}. ${s}`),
    "",
    "Consejo de Eaty",
  ];
  return lines.join("\n");
}

interface TipsCarouselProps {
  className?: string;
  /** Meta calórica del perfil, si está disponible, para afinar los consejos de la IA */
  dailyGoal?: number;
}

export function TipsCarousel({ className, dailyGoal }: TipsCarouselProps) {
  const [tips, setTips] = useState<PersonalizedNutritionTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [howToTip, setHowToTip] = useState<PersonalizedNutritionTip | null>(
    null
  );
  const { user } = useAuth();
  const { toast } = useToast();

  const loadTips = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [meals, stats] = await Promise.all([
        getUserMeals(user.uid),
        getTodayStats(user.uid),
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayMeals = meals.filter((meal) => {
        const mealDate = meal.createdAt;
        return mealDate >= today && mealDate < tomorrow;
      });

      if (todayMeals.length > 0) {
        const sorted = [...todayMeals].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
        const recentSummary = sorted[0]
          ? `Última comida registrada: ${sorted[0].foodName}`
          : undefined;

        const idToken = await user.getIdToken(true);
        const generatedTips = await generateNutritionTips(
          todayMeals.map((meal) => ({
            foodName: meal.foodName,
            calories: meal.calories,
            macros: {
              protein: meal.macros.protein,
              carbs: meal.macros.carbs,
              fat: meal.macros.fat,
            },
          })),
          stats.totalCalories,
          dailyGoal,
          { recentSummary, idToken }
        );
        setTips(generatedTips);
      } else {
        setTips(STATIC_TIPS_NO_MEALS);
      }
    } catch (error) {
      logger.error("Error loading tips", error);
      if (error instanceof GroqApiError && error.status === 429) {
        toast({
          title: "Límite diario",
          description: error.message,
          variant: "destructive",
        });
      }
      setTips(STATIC_TIPS_ERROR);
    } finally {
      setLoading(false);
    }
  }, [user, dailyGoal, toast]);

  useEffect(() => {
    void loadTips();
  }, [loadTips]);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
      setIsAutoPlaying(false);
      setTimeout(() => setIsAutoPlaying(true), 10000);
    });

    const interval = setInterval(() => {
      if (isAutoPlaying && api.canScrollNext()) {
        api.scrollNext();
      } else if (isAutoPlaying) {
        api.scrollTo(0);
      }
    }, 5000);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + 100 / 50;
      });
    }, 100);

    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
    };
  }, [api, isAutoPlaying]);

  const toggleFavorite = useCallback(
    (index: number) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        const wasFavorite = next.has(index);

        if (wasFavorite) {
          next.delete(index);
          toast({
            title: "Consejo removido de favoritos",
            description: "Ya no verás este consejo como favorito",
          });
        } else {
          next.add(index);
          toast({
            title: "Consejo en favoritos",
            description: "Podrás revisar este consejo más tarde",
          });
        }
        return next;
      });
    },
    [toast]
  );

  const shareTip = useCallback(
    async (tip: PersonalizedNutritionTip) => {
      const text = formatTipForShare(tip);
      try {
        if (navigator.share) {
          await navigator.share({
            title: "Consejo nutricional — Eaty",
            text,
            url: window.location.href,
          });
          toast({
            title: "Consejo compartido",
            description: "El consejo se compartió correctamente",
          });
        } else {
          await navigator.clipboard.writeText(text);
          toast({
            title: "Consejo copiado",
            description: "El texto se copió al portapapeles",
          });
        }
      } catch {
        toast({
          title: "Error al compartir",
          description: "No se pudo compartir el consejo",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Cargando consejos…
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tips.length === 0) {
    return null;
  }

  return (
    <>
      <Card className={className}>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                Consejos personalizados
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="h-8 w-8 p-0 hover:bg-primary/10"
              title={
                isAutoPlaying
                  ? "Pausar auto-reproducción"
                  : "Iniciar auto-reproducción"
              }
            >
              {isAutoPlaying ? (
                <Pause className="h-4 w-4 text-primary" />
              ) : (
                <Play className="h-4 w-4 text-primary" />
              )}
            </Button>
          </div>

          <Carousel setApi={setApi} className="w-full">
            <CarouselContent>
              {tips.map((tip, index) => (
                <CarouselItem key={`tip-${index}`}>
                  <div className="animate-in fade-in-0 slide-in-from-bottom-4 relative rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-secondary to-accent/40 p-4 shadow-sm duration-500 sm:p-6">
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 animate-pulse items-center justify-center rounded-full bg-primary/15">
                        <Lightbulb className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-3">
                        <div>
                          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-primary">
                            Qué cambiar
                          </p>
                          <p className="mt-1 text-sm font-semibold leading-snug text-foreground sm:text-base">
                            {tip.whatToChange}
                          </p>
                        </div>
                        <div className="flex gap-2 rounded-lg border border-border/60 bg-background/50 p-2.5">
                          <MapPin
                            className="mt-0.5 h-4 w-4 shrink-0 text-chart-2"
                            aria-hidden
                          />
                          <div>
                            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">
                              Dónde hacerlo
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-card-foreground sm:text-sm">
                              {tip.whereApply}
                            </p>
                          </div>
                        </div>
                        {tip.whyItHelps ? (
                          <div className="flex gap-2 rounded-lg border border-primary/10 bg-primary/5 p-2.5">
                            <Sparkles
                              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                              aria-hidden
                            />
                            <div>
                              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-primary/90">
                                Por qué conviene
                              </p>
                              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                                {tip.whyItHelps}
                              </p>
                            </div>
                          </div>
                        ) : null}
                        <ol className="list-decimal space-y-1.5 pl-4 text-xs text-muted-foreground sm:text-sm">
                          {tip.miniSteps.map((step, i) => (
                            <li key={i} className="leading-snug">
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 border-t border-primary/15 pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <Button
                        type="button"
                        size="sm"
                        className="w-full gap-2 rounded-xl bg-primary text-primary-foreground shadow-sm sm:w-auto"
                        onClick={() => setHowToTip(tip)}
                      >
                        <ChefHat className="h-4 w-4" />
                        Cómo hacerlo y recetas
                      </Button>
                      <div className="flex items-center justify-between gap-2 sm:justify-end">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFavorite(index)}
                            className={cn(
                              "h-8 w-8 p-0 hover:bg-primary/10",
                              favorites.has(index) &&
                                "text-destructive hover:text-destructive/90"
                            )}
                            aria-label="Favorito"
                          >
                            <Heart
                              className={cn(
                                "h-4 w-4 transition-all",
                                favorites.has(index) &&
                                  "scale-110 fill-current"
                              )}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => shareTip(tip)}
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                            aria-label="Compartir"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          {current}/{count}
                        </span>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>

            <div className="mt-4 flex justify-center gap-2">
              {Array.from({ length: count }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => api?.scrollTo(index)}
                  className={cn(
                    "h-2 w-2 rounded-full transition-all duration-300",
                    current === index + 1
                      ? "scale-125 bg-primary"
                      : "bg-primary/25 hover:bg-primary/40"
                  )}
                  aria-label={`Ir al consejo ${index + 1}`}
                />
              ))}
            </div>

            {isAutoPlaying && tips.length > 1 && (
              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-primary/15">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {tips.length > 1 && (
              <>
                <CarouselPrevious className="left-2 border-primary/20 bg-card/90 hover:bg-card" />
                <CarouselNext className="right-2 border-primary/20 bg-card/90 hover:bg-card" />
              </>
            )}
          </Carousel>
        </CardContent>
      </Card>

      <Sheet
        open={howToTip !== null}
        onOpenChange={(open) => {
          if (!open) setHowToTip(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[90vh] overflow-y-auto rounded-t-2xl sm:max-w-lg"
        >
          {howToTip ? (
            <>
              <SheetHeader className="text-left">
                <SheetTitle className="flex items-center gap-2 pr-8">
                  <ChefHat className="h-5 w-5 text-primary" />
                  Cómo hacerlo
                </SheetTitle>
                <SheetDescription className="text-left text-base font-medium text-foreground">
                  {howToTip.whatToChange}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 px-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Dónde aplicarlo
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {howToTip.whereApply}
                  </p>
                </div>
                {howToTip.whyItHelps ? (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Por qué ayuda
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {howToTip.whyItHelps}
                    </p>
                  </div>
                ) : null}
                <Separator />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-primary">
                    Pasos en la cocina (o al pedir)
                  </p>
                  <ol className="mt-2 list-decimal space-y-2 pl-4 text-sm text-foreground">
                    {howToTip.miniSteps.map((step, i) => (
                      <li key={i} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Abre búsquedas en el navegador con ideas de recetas alineadas a
                  este cambio. Eaty no controla el contenido externo.
                </p>
              </div>

              <SheetFooter className="flex-col gap-2 sm:flex-col">
                {(() => {
                  const links = buildRecipeSearchLinks(
                    howToTip.recipeSearchQuery
                  );
                  return (
                    <>
                      <Button
                        type="button"
                        className="w-full gap-2"
                        asChild
                      >
                        <a
                          href={links.googleRecipes}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Recetas en la web (Google)
                        </a>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2"
                        asChild
                      >
                        <a
                          href={links.youtubeHowTo}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Vídeos paso a paso (YouTube)
                        </a>
                      </Button>
                    </>
                  );
                })()}
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
