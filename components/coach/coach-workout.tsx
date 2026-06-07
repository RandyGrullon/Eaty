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
      <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide">
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
          {LEVEL_LABEL[w.level]}
        </span>
        <span className="rounded-full bg-chart-2/10 px-2.5 py-1 text-chart-2">
          {w.daysPerWeek} días/sem
        </span>
        {w.estimatedCaloriesPerSession ? (
          <span className="flex items-center gap-1 rounded-full bg-chart-4/10 px-2.5 py-1 text-chart-4">
            <Flame className="h-3 w-3" />~{w.estimatedCaloriesPerSession} kcal
          </span>
        ) : null}
      </div>

      {w.warmup.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Calentamiento
          </p>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
            {w.warmup.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        {w.days.map((d, i) => (
          <div key={i} className="rounded-xl border border-border/40 bg-card/40 p-3">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-sm font-black text-foreground">{d.day}</p>
              {d.focus ? (
                <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
                  {d.focus}
                </span>
              ) : null}
            </div>
            <div className="space-y-1.5">
              {d.exercises.map((ex, j) => (
                <div
                  key={j}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="font-medium text-foreground">{ex.name}</span>
                  <span className="shrink-0 font-bold tabular-nums text-muted-foreground">
                    {ex.sets} × {ex.reps}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {w.tips.length > 0 && (
        <div className="rounded-xl border border-primary/15 bg-primary/5 p-3">
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-primary">
            Consejos
          </p>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-foreground/80">
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
    <div className="rounded-2xl border border-border/40 bg-card/50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-foreground">
            {workout.title}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
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
        <div className="border-t border-border/40 p-4">
          <WorkoutView w={workout} />
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 gap-2 rounded-xl text-destructive hover:bg-destructive/10"
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
      <div className="space-y-4 rounded-2xl border border-border/40 bg-card/40 p-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Nivel
          </Label>
          <div className="flex gap-2">
            {(["beginner", "intermediate", "advanced"] as Level[]).map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => setLevel(lv)}
                className={cn(
                  "flex-1 rounded-xl border px-2 py-2 text-[11px] font-bold transition-all",
                  level === lv
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/40 bg-card/40 text-muted-foreground hover:bg-card"
                )}
              >
                {LEVEL_LABEL[lv]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Días por semana
          </Label>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDays(n)}
                className={cn(
                  "h-9 w-9 rounded-xl border text-xs font-black tabular-nums transition-all",
                  days === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/40 bg-card/40 text-muted-foreground hover:bg-card"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Equipamiento (opcional)
            </Label>
            <Input
              placeholder="mancuernas, banco…"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="h-10 rounded-xl border-border/40 bg-card/40"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Enfoque (opcional)
            </Label>
            <Input
              placeholder="glúteos, core…"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              className="h-10 rounded-xl border-border/40 bg-card/40"
            />
          </div>
        </div>

        <Button
          className="w-full rounded-xl font-black shadow-lg shadow-primary/20"
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
        <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-black text-foreground">{draft.title}</h4>
            <Button
              size="sm"
              className="gap-2 rounded-xl font-bold"
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
            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
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
