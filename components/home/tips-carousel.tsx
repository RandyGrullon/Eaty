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
import { Lightbulb, Loader2, Heart, Share2, Play, Pause } from "lucide-react";
import { generateNutritionTips } from "@/lib/groq";
import { getUserMeals, getTodayStats } from "@/lib/meals";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TipsCarouselProps {
  className?: string;
}

export function TipsCarousel({ className }: TipsCarouselProps) {
  const [tips, setTips] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadTips();
    }
  }, [user]);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
      // Pause auto-play when user manually navigates
      setIsAutoPlaying(false);
      setTimeout(() => setIsAutoPlaying(true), 10000); // Resume after 10 seconds
    });

    // Auto-play functionality
    const interval = setInterval(() => {
      if (isAutoPlaying && api.canScrollNext()) {
        api.scrollNext();
      } else if (isAutoPlaying) {
        api.scrollTo(0);
      }
    }, 5000); // Change slide every 5 seconds

    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + 100 / 50; // 50 steps for 5 seconds
      });
    }, 100);

    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
    };
  }, [api, isAutoPlaying]);

  const loadTips = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get today's meals and stats
      const [meals, stats] = await Promise.all([
        getUserMeals(user.uid),
        getTodayStats(user.uid),
      ]);

      // Filter today's meals
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayMeals = meals.filter((meal) => {
        const mealDate = meal.createdAt;
        return mealDate >= today && mealDate < tomorrow;
      });

      // Generate tips if we have meals
      if (todayMeals.length > 0) {
        const sorted = [...todayMeals].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
        const recentSummary = sorted[0]
          ? `Última comida registrada: ${sorted[0].foodName}`
          : undefined;

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
          undefined,
          { recentSummary }
        );
        setTips(generatedTips);
      } else {
        // Default tips when no meals
        setTips([
          "¡Comienza tu día con una comida balanceada!",
          "Recuerda incluir verduras en cada comida",
          "Mantén un horario regular de comidas",
          "Bebe suficiente agua durante el día",
        ]);
      }
    } catch (error) {
      console.error("Error loading tips:", error);
      setTips([
        "Mantén un equilibrio nutricional en tus comidas",
        "Incluye proteínas magras en cada comida",
        "No olvides las frutas y verduras",
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = useCallback(
    (index: number) => {
      setFavorites((prev) => {
        const newFavorites = new Set(prev);
        const wasFavorite = newFavorites.has(index);

        if (wasFavorite) {
          newFavorites.delete(index);
          toast({
            title: "Consejo removido de favoritos",
            description: "Ya no verás este consejo como favorito",
          });
        } else {
          newFavorites.add(index);
          toast({
            title: "¡Consejo agregado a favoritos! ❤️",
            description: "Podrás revisar este consejo más tarde",
          });
        }
        return newFavorites;
      });
    },
    [toast]
  );

  const shareTip = useCallback(
    async (tip: string) => {
      try {
        if (navigator.share) {
          await navigator.share({
            title: "Consejo Nutricional - Eaty",
            text: tip,
            url: window.location.href,
          });
          toast({
            title: "Consejo compartido",
            description: "El consejo se compartió exitosamente",
          });
        } else {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(tip);
          toast({
            title: "Consejo copiado",
            description: "El consejo se copió al portapapeles",
          });
        }
      } catch (error) {
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
              Cargando consejos...
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
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
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
              <CarouselItem key={index}>
                <div className="relative p-4 sm:p-6 bg-gradient-to-br from-primary/8 via-secondary to-accent/40 rounded-xl border border-primary/20 shadow-sm animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/15 rounded-full flex items-center justify-center animate-pulse">
                      <Lightbulb className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base text-card-foreground leading-relaxed font-medium break-words">
                        {tip}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-primary/15">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(index)}
                        className={cn(
                          "h-8 w-8 p-0 hover:bg-primary/10 transition-colors",
                          favorites.has(index) &&
                            "text-destructive hover:text-destructive/90"
                        )}
                      >
                        <Heart
                          className={cn(
                            "h-4 w-4 transition-all",
                            favorites.has(index) && "fill-current scale-110"
                          )}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => shareTip(tip)}
                        className="h-8 w-8 p-0 hover:bg-primary/10 transition-colors"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-full">
                      {current}/{count}
                    </span>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Custom dot indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: count }).map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  current === index + 1
                    ? "bg-primary scale-125"
                    : "bg-primary/25 hover:bg-primary/40"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Progress bar for auto-play */}
          {isAutoPlaying && tips.length > 1 && (
            <div className="mt-3 w-full bg-primary/15 rounded-full h-1 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-100 ease-linear rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {tips.length > 1 && (
            <>
              <CarouselPrevious className="left-2 bg-card/90 hover:bg-card border-primary/20" />
              <CarouselNext className="right-2 bg-card/90 hover:bg-card border-primary/20" />
            </>
          )}
        </Carousel>
      </CardContent>
    </Card>
  );
}
