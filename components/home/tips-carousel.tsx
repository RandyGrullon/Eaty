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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

function formatTipForShare(tip: PersonalizedNutritionTip): string {
  const lines = [
    `🔧 Qué cambiar: ${tip.whatToChange}`,
    `📍 Dónde aplicarlo: ${tip.whereApply}`,
    ...(tip.whyItHelps ? [`💡 Por qué ayuda: ${tip.whyItHelps}`] : []),
    "",
    `📖 Receta: ${tip.recipe.title}`,
    "Ingredientes:",
    ...tip.recipe.ingredients.map(ing => `- ${ing}`),
    "",
    "Pasos:",
    ...tip.recipe.steps.map((s, i) => `${i + 1}. ${s}`),
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
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="relative overflow-hidden rounded-[2.5rem] border border-primary/20 bg-gradient-to-br from-primary/10 via-card/90 to-accent/20 p-6 shadow-2xl shadow-black/[0.03] transition-all hover:shadow-primary/5 sm:p-8"
                  >
                    {/* Background decorative elements */}
                    <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/5 blur-3xl" aria-hidden />
                    <div className="absolute -left-12 -bottom-12 h-32 w-32 rounded-full bg-chart-2/5 blur-3xl" aria-hidden />

                    <div className="relative flex flex-col gap-6 sm:flex-row">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] bg-primary text-white shadow-xl shadow-primary/20">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      
                      <div className="min-w-0 flex-1 space-y-6">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-black text-[9px] uppercase tracking-widest px-2">
                              Consejo Eaty
                            </Badge>
                          </div>
                          <h4 className="text-xl font-black tracking-tight text-foreground leading-tight sm:text-2xl">
                            {tip.whatToChange}
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="group rounded-[1.5rem] border border-border/40 bg-background/40 p-4 backdrop-blur-sm transition-colors hover:bg-background/60">
                            <div className="flex items-center gap-2 mb-2 text-primary">
                              <MapPin className="h-4 w-4" aria-hidden />
                              <span className="text-[10px] font-black uppercase tracking-[0.15em]">Cuándo</span>
                            </div>
                            <p className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                              {tip.whereApply}
                            </p>
                          </div>

                          {tip.whyItHelps && (
                            <div className="group rounded-[1.5rem] border border-border/40 bg-background/40 p-4 backdrop-blur-sm transition-colors hover:bg-background/60">
                              <div className="flex items-center gap-2 mb-2 text-chart-2">
                                <Lightbulb className="h-4 w-4" aria-hidden />
                                <span className="text-[10px] font-black uppercase tracking-[0.15em]">Beneficio</span>
                              </div>
                              <p className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                                {tip.whyItHelps}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Pasos rápidos</p>
                          <div className="grid gap-2">
                            {tip.miniSteps.map((step, i) => (
                              <div key={i} className="flex items-center gap-3 rounded-xl bg-primary/5 p-3 border border-primary/5 group/step">
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-primary text-[10px] font-black text-white shadow-lg shadow-primary/10 group-hover/step:scale-110 transition-transform">
                                  {i + 1}
                                </div>
                                <p className="text-xs font-bold text-foreground leading-relaxed">
                                  {step}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex flex-col gap-3 border-t border-border/20 pt-6 sm:flex-row sm:items-center sm:justify-between">
                      <Button
                        type="button"
                        className="w-full gap-2 rounded-2xl bg-primary h-12 font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform sm:w-auto"
                        onClick={() => setHowToTip(tip)}
                      >
                        <ChefHat className="h-5 w-5" />
                        Ver Receta Completa
                      </Button>

                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFavorite(index)}
                          className={cn(
                            "h-12 w-12 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm transition-all hover:bg-card",
                            favorites.has(index) && "text-destructive border-destructive/20 bg-destructive/5"
                          )}
                          aria-label="Favorito"
                        >
                          <Heart className={cn("h-5 w-5 transition-all", favorites.has(index) && "scale-110 fill-current")} />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => shareTip(tip)}
                          className="h-12 w-12 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm transition-all hover:bg-card"
                          aria-label="Compartir"
                        >
                          <Share2 className="h-5 w-5" />
                        </Button>

                        <div className="ml-2 flex h-12 items-center rounded-2xl border border-border/40 bg-card/40 px-4 backdrop-blur-sm">
                          <span className="text-xs font-black tabular-nums tracking-tighter text-primary">
                            {current} <span className="text-muted-foreground/40 mx-1">/</span> {count}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
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
          className="max-h-[90vh] overflow-y-auto rounded-t-[2.5rem] sm:max-w-2xl mx-auto border-t-0 shadow-2xl"
        >
          {howToTip ? (
            <div className="max-w-xl mx-auto py-6">
              <SheetHeader className="text-left mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <ChefHat className="h-6 w-6 text-primary" />
                  </div>
                  <SheetTitle className="text-2xl font-black tracking-tight">
                    {howToTip.recipe.title}
                  </SheetTitle>
                </div>
                <SheetDescription className="text-base font-semibold text-muted-foreground leading-snug">
                  {howToTip.whatToChange}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">📍 Aplicación</p>
                    <p className="text-sm font-medium text-foreground bg-muted/30 p-4 rounded-3xl border border-border/40 shadow-inner">
                      {howToTip.whereApply}
                    </p>
                  </div>
                  {howToTip.whyItHelps && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-chart-2">💡 Beneficio</p>
                      <p className="text-sm font-medium text-muted-foreground bg-chart-2/5 p-4 rounded-3xl border border-chart-2/10 shadow-inner">
                        {howToTip.whyItHelps}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-black tracking-tight flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                      <Utensils className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    Ingredientes Necesarios
                  </h4>
                  <div className="grid grid-cols-1 gap-2.5">
                    {howToTip.recipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex items-center gap-4 text-sm font-bold text-foreground bg-card p-4 rounded-2xl border border-border/40 shadow-sm transition-all hover:border-primary/30">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary">
                          {i + 1}
                        </div>
                        {ing}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pb-12">
                  <h4 className="text-lg font-black tracking-tight flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ChefHat className="h-4 w-4 text-primary" />
                    </div>
                    Pasos de Preparación
                  </h4>
                  <div className="space-y-5">
                    {howToTip.recipe.steps.map((step, i) => (
                      <div key={i} className="relative flex gap-5 group">
                        {i < howToTip.recipe.steps.length - 1 && (
                          <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 to-transparent" aria-hidden />
                        )}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-xs font-black text-white shadow-xl shadow-primary/20 transition-transform group-hover:scale-110">
                          {i + 1}
                        </div>
                        <div className="flex-1 pt-1.5">
                          <p className="text-sm font-semibold leading-relaxed text-foreground">
                            {step}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
