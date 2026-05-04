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
import { X, Trash2, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { doc, deleteDoc } from "firebase/firestore";
import { appFirebase } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import type { Meal } from "@/types/meal";

interface MealDetailModalProps {
  meal: Meal;
  onClose: () => void;
  onDelete: () => void;
}

export function MealDetailModal({ meal, onClose, onDelete }: MealDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-foreground">Detalle de comida</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              disabled={isDeleting}
              className="text-destructive hover:bg-destructive/10 p-2"
            >
              {isDeleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <Card>
            <CardContent className="p-4 text-center">
              {meal.imageUrl ? (
                <div className="w-full max-h-72 mb-4 rounded-xl overflow-hidden bg-muted border border-border">
                  <img
                    src={meal.imageUrl}
                    alt={meal.foodName}
                    className="w-full h-full max-h-72 object-contain mx-auto"
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mb-4 text-center max-w-sm mx-auto">
                  Sin imagen en el registro.
                </p>
              )}
              <h3 className="text-xl font-bold text-foreground mb-2">{meal.foodName}</h3>
              <div className="text-3xl font-bold text-primary mb-1">{meal.calories}</div>
              <div className="text-sm text-muted-foreground mb-3">kcal (estimación)</div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formatDate(meal.createdAt)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Macronutrientes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {macroData.map((macro) => {
                const percentage = totalMacros > 0 ? (macro.value / totalMacros) * 100 : 0;
                return (
                  <div key={macro.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{macro.name}</span>
                      <span className="text-sm font-bold">
                        {macro.value}
                        {macro.unit}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${macro.color}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      {percentage.toFixed(1)}%
                    </div>
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
              {meal.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-0.5 text-xs">
                    {index + 1}
                  </Badge>
                  <p className="text-sm text-foreground leading-relaxed">{recommendation}</p>
                </div>
              ))}
            </CardContent>
          </Card>
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
