"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/page-header";
import {
  Sparkles,
  ChefHat,
  Salad,
  UtensilsCrossed,
} from "lucide-react";
import { useAppData } from "@/hooks/use-app-data";
import { DietCard } from "./diet-card";
import { DietDetailDrawer } from "./diet-detail";
import { GenerateDietModal } from "./generate-diet-modal";
import { CreateDietModal } from "./create-diet-modal";
import { DIET_GOAL_LABEL, type DietGoal } from "@/types/diet";

const QUICK_GOALS: DietGoal[] = [
  "shedding",
  "bulking",
  "high_protein",
  "keto",
  "vegan",
  "mediterranean",
];

export function DietsScreen() {
  const { diets, activeDiet, loading } = useAppData();
  const [selectedDietId, setSelectedDietId] = useState<string | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateGoal, setGenerateGoal] = useState<DietGoal | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);

  const selectedDiet = diets.find((d) => d.id === selectedDietId) ?? null;

  const openGenerate = (goal?: DietGoal) => {
    setGenerateGoal(goal);
    setGenerateOpen(true);
  };

  return (
    <div className="min-h-full bg-background pb-32 md:pb-12">
      <PageHeader
        title="Dietas"
        subtitle="Planes, platos y tutoriales"
        badge={
          <Badge variant="secondary" className="shrink-0 rounded-full border-none bg-primary/10 px-2 py-0 text-primary tabular">
            {diets.length}
          </Badge>
        }
        actions={
          <div className="hidden items-center gap-2 sm:flex">
            <Button variant="outline" className="h-10 rounded-full" onClick={() => setCreateOpen(true)}>
              <ChefHat className="h-4 w-4" />
              Crear mi dieta
            </Button>
            <Button className="h-10 rounded-full" onClick={() => openGenerate()}>
              <Sparkles className="h-4 w-4" />
              Generar con IA
            </Button>
          </div>
        }
      >
        <div className="mt-4 grid grid-cols-2 gap-2 sm:hidden">
          <Button className="h-11 rounded-full" onClick={() => openGenerate()}>
            <Sparkles className="h-4 w-4" />
            Generar con IA
          </Button>
          <Button variant="outline" className="h-11 rounded-full" onClick={() => setCreateOpen(true)}>
            <ChefHat className="h-4 w-4" />
            Crear mi dieta
          </Button>
        </div>

        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
          {QUICK_GOALS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => openGenerate(g)}
              className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {DIET_GOAL_LABEL[g]}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 lg:px-10">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : diets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center">
            <Salad className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <h3 className="mt-3 font-semibold">Tu recetario está vacío</h3>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
              Genera una dieta con IA o crea la tuya. Cada plato trae su tutorial paso a paso.
            </p>
            <Button className="mt-4 h-11 rounded-full px-6" onClick={() => openGenerate()}>
              <Sparkles className="h-4 w-4" />
              Generar mi primera dieta
            </Button>
          </div>
        ) : (
          <>
            {activeDiet && (
              <p className="mb-4 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                <UtensilsCrossed className="h-4 w-4 shrink-0 text-primary" />
                <span className="shrink-0">Dieta activa:</span>
                <span className="truncate font-medium text-foreground">{activeDiet.name}</span>
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {diets.map((diet) => (
                <DietCard
                  key={diet.id}
                  diet={diet}
                  isActive={activeDiet?.id === diet.id}
                  onClick={() => setSelectedDietId(diet.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <DietDetailDrawer
        diet={selectedDiet}
        open={selectedDietId !== null}
        onOpenChange={(o) => {
          if (!o) setSelectedDietId(null);
        }}
      />
      <GenerateDietModal
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onCreated={(id) => setSelectedDietId(id)}
        initialGoal={generateGoal}
      />
      <CreateDietModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => setSelectedDietId(id)}
      />
    </div>
  );
}
