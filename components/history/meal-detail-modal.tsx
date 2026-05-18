"use client";

import { useState, useRef } from "react";
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
import { X, Trash2, Calendar, Loader2, Camera, Lightbulb, ChevronRight, Share2, Download } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { doc, deleteDoc } from "firebase/firestore";
import { appFirebase } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import type { Meal } from "@/types/meal";
import { toPng } from "html-to-image";

interface MealDetailModalProps {
  meal: Meal;
  onClose: () => void;
  onDelete: () => void;
}

export function MealDetailModal({ meal, onClose, onDelete }: MealDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleShare = async () => {
    if (!shareRef.current) return;
    setIsSharing(true);
    try {
      // Pequeño retardo para asegurar que los estilos estén listos
      await new Promise(r => setTimeout(r, 100));
      
      const dataUrl = await toPng(shareRef.current, {
        cacheBust: true,
        backgroundColor: "hsl(var(--background))",
        style: {
          borderRadius: "0px", // Para que la imagen se vea bien
        }
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `eaty-meal-${meal.id}.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Eaty: Mi comida - ${meal.foodName}`,
          text: `He comido ${meal.foodName} (${meal.calories} kcal). ¡Mira mi análisis en Eaty!`,
        });
      } else {
        // Fallback: Descargar
        const link = document.createElement("a");
        link.download = `eaty-${meal.foodName.toLowerCase().replace(/\s+/g, "-")}.png`;
        link.href = dataUrl;
        link.click();
        toast({
          title: "Imagen descargada",
          description: "Tu navegador no soporta compartir archivos directamente.",
        });
      }
    } catch (error) {
      logger.error("Error sharing meal", error);
      toast({
        title: "Error al compartir",
        description: "No se pudo generar la imagen para compartir.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const macroData = [
    { name: "Proteínas", value: meal.macros.protein, color: "bg-chart-1", unit: "g" },
    { name: "Carbohidratos", value: meal.macros.carbs, color: "bg-chart-2", unit: "g" },
    { name: "Grasas", value: meal.macros.fat, color: "bg-chart-4", unit: "g" },
    { name: "Fibra", value: meal.macros.fiber, color: "bg-chart-3", unit: "g" },
    { name: "Azúcar", value: meal.macros.sugar, color: "bg-chart-5", unit: "g" },
  ];

  const totalMacros = meal.macros.protein + meal.macros.carbs + meal.macros.fat;

  const runDelete = async () => {
    if (!user) {
      setDeleteOpen(false);
      toast({
        title: "Sesión requerida",
        description: "Vuelve a iniciar sesión e inténtalo de nuevo.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    setDeleteOpen(false);
    try {
      await deleteDoc(
        doc(appFirebase.db, "users", user.uid, "meals", meal.id)
      );
      toast({
        title: "Comida eliminada",
        description: "Se quitó de tu historial.",
      });
      onDelete();
      onClose();
    } catch (error) {
      logger.error("Error deleting meal", error);
      toast({
        title: "No se pudo eliminar",
        description: "Revisa la conexión o inténtalo más tarde.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-[3rem] border border-border/40 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header con estilo flotante interno */}
        <div className="flex items-center justify-between p-6 border-b border-border/40 bg-card/20">
          <div>
            <h2 className="text-xl font-black tracking-tight text-foreground">Detalle de Comida</h2>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-0.5">Historial Nutricional</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              disabled={isSharing}
              className="h-10 w-10 rounded-xl text-primary hover:bg-primary/10 transition-colors"
              title="Compartir en redes"
            >
              {isSharing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Share2 className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteOpen(true)}
              disabled={isDeleting}
              className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
            >
              {isDeleting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Trash2 className="h-5 w-5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 rounded-xl hover:bg-accent transition-colors">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8" ref={shareRef}>
          {/* Hero Section similar a AnalysisResults */}
          <section className="relative overflow-hidden rounded-[2.5rem] border border-border/40 bg-card/40 shadow-xl shadow-black/[0.02]">
            {meal.imageUrl ? (
              <div className="aspect-video w-full overflow-hidden sm:aspect-[21/9]">
                <img src={meal.imageUrl} alt={meal.foodName} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
              </div>
            ) : (
              <div className="flex h-32 w-full items-center justify-center bg-muted/30">
                <Camera className="h-10 w-10 text-muted-foreground/20" />
              </div>
            )}
            <div className="relative p-6 sm:p-8 text-center sm:text-left sm:flex sm:items-end sm:justify-between sm:gap-6">
              <div className="min-w-0 flex-1">
                <h3 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                  {meal.foodName}
                </h3>
                <div className="mt-3 flex items-center justify-center sm:justify-start gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(meal.createdAt)}
                </div>
              </div>
              <div className="mt-6 sm:mt-0 text-center sm:text-right shrink-0">
                <div className="text-6xl font-black tracking-tighter text-primary tabular-nums">
                  {meal.calories}
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
                  kcal registradas
                </p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { name: "Proteínas", key: "protein", color: "bg-chart-1" },
                { name: "Carbos", key: "carbs", color: "bg-chart-2" },
                { name: "Grasas", key: "fat", color: "bg-chart-4" },
              ].map((m) => {
                const val = meal.macros[m.key as keyof typeof meal.macros];
                const pct = totalMacros > 0 ? (val / totalMacros) * 100 : 0;
                return (
                  <div key={m.name} className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/40 p-6 shadow-xl shadow-black/[0.02] backdrop-blur-sm group">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 mb-3">
                      {m.name}
                    </p>
                    <p className="text-4xl font-black tracking-tighter tabular-nums">{val}g</p>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <span>{pct.toFixed(0)}% del total</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted shadow-inner">
                        <div className={cn("h-full rounded-full shadow-lg", m.color)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-7 space-y-8">
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-chart-2" />
                  <h3 className="text-lg font-black tracking-tight text-foreground">Sugerencias del día</h3>
                </div>
                <div className="grid gap-3">
                  {meal.recommendations.map((rec, i) => (
                    <div key={i} className="flex gap-4 items-start rounded-2xl border border-border/40 bg-card/40 p-4">
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

            <div className="lg:col-span-5">
              <section className="space-y-4">
                <h3 className="text-lg font-black tracking-tight text-foreground">Otros Detalles</h3>
                <div className="rounded-[2rem] border border-border/40 bg-card/40 p-6 shadow-sm backdrop-blur-sm space-y-6">
                  {[
                    { name: "Fibra", val: meal.macros.fiber, color: "bg-chart-3" },
                    { name: "Azúcar", val: meal.macros.sugar, color: "bg-chart-5" },
                  ].map((m) => (
                    <div key={m.name} className="group">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{m.name}</span>
                        <span className="text-lg font-black tabular-nums">{m.val}g</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted shadow-inner overflow-hidden">
                        <div className={cn("h-full rounded-full opacity-60", m.color)} style={{ width: "50%" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta comida?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará del historial. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                void runDelete();
              }}
            >
              Eliminar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
