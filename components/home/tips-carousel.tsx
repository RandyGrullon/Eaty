"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
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
  Heart,
  Share2,
  Play,
  Pause,
  ChefHat,
  MapPin,
  Sparkles,
  ExternalLink,
  Utensils,
} from "lucide-react";
import { generateNutritionTips } from "@/lib/groq";
import { GroqApiError } from "@/lib/groq-api-error";
import { logger } from "@/lib/logger";
import { getUserMeals, getTodayStats } from "@/lib/meals";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PersonalizedNutritionTip } from "@/lib/food-analysis-schema";
import {
  STATIC_TIPS_ERROR,
  STATIC_TIPS_NO_MEALS,
} from "@/lib/nutrition-tip-defaults";
import { buildRecipeSearchLinks } from "@/lib/nutrition-tip-recipes";
import { shareNutritionTip } from "@/lib/tip-share";

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
  const { userProfile } = useUserProfile();
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

        const idToken = await user.getIdToken();
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
          { 
            recentSummary, 
            idToken,
            lang: userProfile?.language
          }
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
  }, [user, dailyGoal, toast, userProfile?.language]);

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
      try {
        const action = await shareNutritionTip(tip);
        toast(
          action === "shared"
            ? { title: "Consejo compartido", description: "El consejo se compartió correctamente" }
            : { title: "Consejo copiado", description: "El texto se copió al portapapeles" }
        );
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
      <section className={cn("surface p-5 sm:p-6", className)}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-muted" />
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-4 space-y-2.5">
          <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
        </div>
        <span className="sr-only">Cargando consejos…</span>
      </section>
    );
  }

  if (tips.length === 0) {
    return null;
  }

  return (
    <>
      <section className={cn("surface p-5 sm:p-6", className)}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Lightbulb className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">Consejos para ti</h2>
              <p className="text-sm text-muted-foreground tabular">
                {count > 0 ? `${current} de ${count}` : "Según lo que comes hoy"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className="h-9 w-9 shrink-0 rounded-full text-primary"
            title={isAutoPlaying ? "Pausar auto-reproducción" : "Iniciar auto-reproducción"}
            aria-label={isAutoPlaying ? "Pausar auto-reproducción" : "Iniciar auto-reproducción"}
          >
            {isAutoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>

        <Carousel setApi={setApi} className="w-full">
          <CarouselContent>
            {tips.map((tip, index) => (
              <CarouselItem key={`tip-${index}`}>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="flex h-full flex-col"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <h3 className="min-w-0 flex-1 text-lg font-semibold leading-snug sm:text-xl">
                      {tip.whatToChange}
                    </h3>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-2">
                    <div className="rounded-xl bg-muted/60 px-3 py-2.5">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
                        <MapPin className="h-3.5 w-3.5" aria-hidden />
                        Cuándo
                      </p>
                      <p className="mt-1 text-sm">{tip.whereApply}</p>
                    </div>
                    {tip.whyItHelps && (
                      <div className="rounded-xl bg-muted/60 px-3 py-2.5">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-carbs">
                          <Lightbulb className="h-3.5 w-3.5" aria-hidden />
                          Beneficio
                        </p>
                        <p className="mt-1 text-sm">{tip.whyItHelps}</p>
                      </div>
                    )}
                  </div>

                  {tip.miniSteps.length > 0 && (
                    <div className="mt-4">
                      <p className="eyebrow">Pasos rápidos</p>
                      <ol className="mt-2 space-y-1.5">
                        {tip.miniSteps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm">
                            <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium tabular text-primary">
                              {i + 1}
                            </span>
                            <span className="min-w-0">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                    <Button type="button" className="h-10 flex-1 rounded-full sm:flex-none" onClick={() => setHowToTip(tip)}>
                      <ChefHat className="h-4 w-4" />
                      Ver receta
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleFavorite(index)}
                      className={cn(
                        "h-10 w-10 shrink-0 rounded-full",
                        favorites.has(index) && "border-protein/40 text-protein hover:text-protein"
                      )}
                      aria-label="Favorito"
                      aria-pressed={favorites.has(index)}
                    >
                      <Heart className={cn("h-4 w-4", favorites.has(index) && "fill-current")} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => shareTip(tip)}
                      className="h-10 w-10 shrink-0 rounded-full"
                      aria-label="Compartir"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {count > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              {tips.length > 1 && (
                <CarouselPrevious className="static h-8 w-8 translate-y-0 rounded-full" />
              )}
              <div className="flex gap-1.5">
                {Array.from({ length: count }).map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => api?.scrollTo(index)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      current === index + 1 ? "w-5 bg-primary" : "w-1.5 bg-primary/25 hover:bg-primary/40"
                    )}
                    aria-label={`Ir al consejo ${index + 1}`}
                  />
                ))}
              </div>
              {tips.length > 1 && <CarouselNext className="static h-8 w-8 translate-y-0 rounded-full" />}
            </div>
          )}

          {isAutoPlaying && tips.length > 1 && (
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/60 transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </Carousel>
      </section>

      <Sheet
        open={howToTip !== null}
        onOpenChange={(open) => {
          if (!open) setHowToTip(null);
        }}
      >
        <SheetContent side="bottom" className="mx-auto max-h-[90vh] overflow-y-auto rounded-t-2xl sm:max-w-2xl">
          {howToTip ? (
            <div className="mx-auto max-w-xl px-1 py-4 sm:py-6">
              <SheetHeader className="mb-6 p-0 text-left">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ChefHat className="h-5 w-5" />
                  </span>
                  <SheetTitle className="text-2xl font-bold">{howToTip.recipe.title}</SheetTitle>
                </div>
                <SheetDescription className="mt-2 text-base text-muted-foreground">
                  {howToTip.whatToChange}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-7">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-muted/60 px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                      Aplicación
                    </p>
                    <p className="mt-1 text-sm">{howToTip.whereApply}</p>
                  </div>
                  {howToTip.whyItHelps && (
                    <div className="rounded-xl bg-muted/60 px-3 py-2.5">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-carbs">
                        <Lightbulb className="h-3.5 w-3.5" aria-hidden />
                        Beneficio
                      </p>
                      <p className="mt-1 text-sm">{howToTip.whyItHelps}</p>
                    </div>
                  )}
                </div>

                <section>
                  <h4 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-carbs/15 text-carbs">
                      <Utensils className="h-4 w-4" />
                    </span>
                    Ingredientes
                  </h4>
                  <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                    {howToTip.recipe.ingredients.map((ing, i) => (
                      <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {ing}
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="pb-8">
                  <h4 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <ChefHat className="h-4 w-4" />
                    </span>
                    Preparación
                  </h4>
                  <ol className="space-y-3">
                    {howToTip.recipe.steps.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold tabular text-primary-foreground">
                          {i + 1}
                        </span>
                        <p className="min-w-0 flex-1 pt-0.5 text-sm leading-relaxed">{step}</p>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
