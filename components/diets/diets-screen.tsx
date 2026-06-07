"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/page-header";
import {
  Sparkles,
  ChefHat,
  Salad,
  Loader2,
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
    <div className="min-h-screen bg-background pb-28 md:pb-10">
      <PageHeader
        title="Dietas"
        subtitle="Planes, platos y tutoriales"
        badge={
          <Badge
            variant="secondary"
            className="border-none bg-primary/10 px-2 py-0 font-bold text-primary"
          >
            {diets.length}
          </Badge>
        }
      >
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button
            className="h-14 rounded-2xl font-black shadow-lg shadow-primary/20"
            onClick={() => openGenerate()}
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Generar con IA
          </Button>
          <Button
            variant="outline"
            className="h-14 rounded-2xl border-border/40 bg-card/40 font-black"
            onClick={() => setCreateOpen(true)}
          >
            <ChefHat className="mr-2 h-5 w-5" />
            Crear mi dieta
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_GOALS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => openGenerate(g)}
              className="rounded-full border border-border/40 bg-card/40 px-3 py-1.5 text-[11px] font-bold text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
            >
              {DIET_GOAL_LABEL[g]}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="mx-auto max-w-4xl px-4 sm:px-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary/40" />
          </div>
        ) : diets.length === 0 ? (
          <div className="rounded-[3rem] border-2 border-dashed border-border/40 bg-muted/20 px-6 py-20 text-center">
            <Salad className="mx-auto mb-6 h-16 w-16 text-muted-foreground/20" />
            <h3 className="text-xl font-black text-foreground">
              Tu recetario está vacío
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-sm font-medium text-muted-foreground">
              Genera una dieta con IA o crea la tuya. Cada plato incluirá un
              tutorial paso a paso muy detallado.
            </p>
            <Button
              className="mt-8 h-12 rounded-2xl px-8 font-black shadow-xl shadow-primary/20"
              onClick={() => openGenerate()}
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Generar mi primera dieta
            </Button>
          </div>
        ) : (
          <>
            {activeDiet && (
              <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <UtensilsCrossed className="h-3.5 w-3.5 text-chart-2" />
                Dieta activa: <span className="text-foreground">{activeDiet.name}</span>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
