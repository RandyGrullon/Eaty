"use client";

import { useState } from "react";
import { useAppData } from "@/hooks/use-app-data";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dumbbell,
  Loader2,
  Save,
  Trash2,
  ChevronDown,
  Check,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import {
  LEVEL_LABEL,
  type GeneratedWorkout,
  type Workout,
} from "@/types/workout";

type Level = GeneratedWorkout["level"];

function WorkoutView({ w }: { w: GeneratedWorkout }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs font-medium">
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
          {LEVEL_LABEL[w.level]}
        </span>
        <span className="rounded-full bg-accent px-2.5 py-1 text-accent-foreground tabular">
          {w.daysPerWeek} días/sem
        </span>
        {w.estimatedCaloriesPerSession ? (
          <span className="flex items-center gap-1 rounded-full bg-protein/12 px-2.5 py-1 text-protein tabular">
            <Flame className="h-3 w-3" />~{w.estimatedCaloriesPerSession} kcal
          </span>
        ) : null}
      </div>

      {w.warmup.length > 0 && (
        <div className="rounded-xl bg-muted/60 px-3 py-2.5">
          <p className="mb-1 text-sm font-semibold">Calentamiento</p>
          <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
            {w.warmup.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        {w.days.map((d, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-3">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold">{d.day}</p>
              {d.focus ? (
                <span className="truncate text-xs font-medium text-primary">
                  {d.focus}
                </span>
              ) : null}
            </div>
            <div className="space-y-1.5">
              {d.exercises.map((ex, j) => (
                <div
                  key={j}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="min-w-0">{ex.name}</span>
                  <span className="shrink-0 font-medium text-muted-foreground tabular">
                    {ex.sets} × {ex.reps}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {w.tips.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
          <p className="mb-1 text-sm font-semibold text-primary">Consejos</p>
          <ul className="list-disc space-y-0.5 pl-4 text-sm">
            {w.tips.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SavedWorkoutItem({
  workout,
  onDelete,
}: {
  workout: Workout;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {workout.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {workout.goal} · {workout.daysPerWeek} días
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="border-t border-border p-4">
          <WorkoutView w={workout} />
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 gap-2 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(workout.id)}
          >
            <Trash2 className="h-4 w-4" />
            Eliminar rutina
          </Button>
        </div>
      )}
    </div>
  );
}

export function CoachWorkout() {
  const { profile, workouts, saveWorkout, deleteWorkout } = useAppData();
  const { user } = useAuth();
  const { toast } = useToast();

  const [level, setLevel] = useState<Level>("beginner");
  const [days, setDays] = useState(3);
  const [equipment, setEquipment] = useState("");
  const [focus, setFocus] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<GeneratedWorkout | null>(null);

  const generate = async () => {
    if (!user) return;
    setGenerating(true);
    setDraft(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/coach/workout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          goal: profile?.fitnessGoal,
          level,
          daysPerWeek: days,
          equipment: equipment
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          focus: focus.trim() || undefined,
          lang: profile?.language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setDraft(data.workout as GeneratedWorkout);
    } catch (e) {
      logger.error("generate workout", e);
      toast({
        title: "No se pudo generar",
        description: "Inténtalo de nuevo en un momento.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await saveWorkout(draft);
      toast({ title: "Rutina guardada", description: "Está en tus rutinas." });
      setDraft(null);
    } catch (e) {
      logger.error("save workout", e);
      toast({
        title: "No se pudo guardar",
        description: "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWorkout(id);
      toast({ title: "Rutina eliminada" });
    } catch (e) {
      logger.error("delete workout", e);
    }
  };

  return (
    <div className="space-y-5 p-1">
      <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <div className="space-y-2">
          <Label className="font-medium">
            Nivel
          </Label>
          <div className="flex gap-2">
            {(["beginner", "intermediate", "advanced"] as Level[]).map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => setLevel(lv)}
                className={cn(
                  "h-9 min-w-0 flex-1 truncate rounded-full border px-2 text-sm font-medium transition-colors",
                  level === lv
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {LEVEL_LABEL[lv]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-medium">
            Días por semana
          </Label>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDays(n)}
                className={cn(
                  "h-9 w-9 rounded-full border text-sm font-medium tabular transition-colors",
                  days === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="font-medium">
              Equipamiento (opcional)
            </Label>
            <Input
              placeholder="mancuernas, banco…"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-medium">
              Enfoque (opcional)
            </Label>
            <Input
              placeholder="glúteos, core…"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>
        </div>

        <Button
          className="h-11 w-full rounded-full"
          onClick={generate}
          disabled={generating || !user}
        >
          {generating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Dumbbell className="mr-2 h-4 w-4" />
          )}
          {generating ? "Diseñando tu rutina…" : "Generar rutina"}
        </Button>
      </div>

      {draft && (
        <div className="space-y-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="min-w-0 text-base font-semibold">{draft.title}</h4>
            <Button
              size="sm"
              className="shrink-0 gap-2 rounded-full"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar
            </Button>
          </div>
          <WorkoutView w={draft} />
        </div>
      )}

      {workouts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">
              Mis rutinas ({workouts.length})
            </h4>
          </div>
          <div className="space-y-2">
            {workouts.map((w) => (
              <SavedWorkoutItem key={w.id} workout={w} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
