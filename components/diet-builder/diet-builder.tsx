"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Armchair,
  Bike,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Footprints,
  Info,
  Loader2,
  Moon,
  Sparkles,
  Sun,
  Sunrise,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EatyMark } from "@/components/app/eaty-logo";
import { OptionCard, StepHeader } from "@/components/onboarding/option-card";
import { useAppData } from "@/hooks/use-app-data";
import { useToast } from "@/hooks/use-toast";
import { getProfileDisplayAge } from "@/lib/age-from-birthdate";
import { parseMeasure } from "@/lib/profile-measure";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import type { Diet } from "@/types/diet";
import {
  DietPlanError,
  EXAMPLE_INGREDIENT_IDS,
  getCatalogIngredient,
  generateDietPlan,
  MEAL_PROTOCOL_LABEL,
  planToNewDiet,
  type AllowedIngredient,
  type BodyMetrics,
  type DietPlan,
  type MealProtocol,
  type PlannedMeal,
} from "@/lib/diet-builder";
import { IngredientPicker } from "./ingredient-picker";
import { RecipeDetail } from "./recipe-detail";

const STEPS = ["Alimentos", "Objetivo", "Protocolo", "Tu plan"] as const;
const LB_PER_KG = 2.20462;

const ACTIVITY: { value: BodyMetrics["activityLevel"]; label: string; icon: typeof Bike }[] = [
  { value: "sedentary", label: "Sedentario", icon: Armchair },
  { value: "light", label: "Ligero", icon: Footprints },
  { value: "moderate", label: "Moderado", icon: Bike },
  { value: "active", label: "Activo", icon: Dumbbell },
  { value: "very_active", label: "Muy activo", icon: Flame },
];

const PROTOCOLS: { value: MealProtocol; description: string; icon: typeof Sun }[] = [
  { value: "if_16_8", description: "Ventana de 8 h (13:00–21:00). Dos comidas grandes y saciantes.", icon: Moon },
  { value: "three_meals", description: "Desayuno, almuerzo y cena. El reparto más fácil de seguir.", icon: Sun },
  { value: "four_meals", description: "Tres comidas y una merienda para llegar con menos hambre.", icon: Sunrise },
];

const num = (s: string) => {
  const n = Number.parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};

function Field({
  label,
  suffix,
  value,
  onChange,
  hint,
}: {
  label: string;
  suffix?: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="text-sm font-medium">{label}</span>
      <div className="relative mt-1.5">
        <Input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn("h-11 tabular", suffix && "pr-12")}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

/** Asistente "Dieta con mis alimentos" (Diet Builder). */
export function DietBuilder({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved?: (id: string) => void }) {
  const { profile, createDiet, activateDiet } = useAppData();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [foods, setFoods] = useState<AllowedIngredient[]>([]);

  // Datos del cuerpo (precargados del perfil).
  const profileWeight = parseMeasure(profile?.weight) ?? 80;
  const useLbs = profile?.weightUnit === "lbs";
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">(useLbs ? "lb" : "kg");
  const [weight, setWeight] = useState(String(Math.round((useLbs ? profileWeight * LB_PER_KG : profileWeight) * 10) / 10));
  const [height, setHeight] = useState(String(Math.round(parseMeasure(profile?.height) ?? 170)));
  const [age, setAge] = useState(String(profile ? getProfileDisplayAge(profile) ?? 30 : 30));
  const [sex, setSex] = useState<BodyMetrics["sex"]>(profile?.gender ?? "male");
  const [activity, setActivity] = useState<BodyMetrics["activityLevel"]>(profile?.activityLevel ?? "moderate");
  const [bodyFat, setBodyFat] = useState("");
  const [muscle, setMuscle] = useState("");
  const [bmr, setBmr] = useState("");
  const [lossLbs, setLossLbs] = useState("15");
  const [days, setDays] = useState("51");
  const [protocol, setProtocol] = useState<MealProtocol>("if_16_8");

  const [dayIndex, setDayIndex] = useState(0);
  const [openMeal, setOpenMeal] = useState<PlannedMeal | null>(null);
  const [saving, setSaving] = useState(false);
  const [activate, setActivate] = useState(true);

  const body: BodyMetrics | null = useMemo(() => {
    const w = num(weight);
    const h = num(height);
    const a = num(age);
    if (!w || !h || !a) return null;
    const weightKg = weightUnit === "lb" ? w / LB_PER_KG : w;
    if (weightKg < 30 || weightKg > 350 || h < 120 || h > 230 || a < 14 || a > 100) return null;
    const bf = num(bodyFat);
    const smm = num(muscle);
    const b = num(bmr);
    return {
      weightKg,
      heightCm: h,
      age: Math.round(a),
      sex,
      activityLevel: activity,
      ...(bf && bf >= 3 && bf <= 70 ? { bodyFatPct: bf } : {}),
      ...(smm && smm >= 10 && smm <= 80 ? { skeletalMuscleKg: weightUnit === "lb" ? smm / LB_PER_KG : smm } : {}),
      ...(b && b >= 800 && b <= 4500 ? { bmrOverride: b } : {}),
    };
  }, [weight, height, age, sex, activity, bodyFat, muscle, bmr, weightUnit]);

  const goalValid = (num(lossLbs) ?? -1) >= 0 && (num(days) ?? 0) >= 7;

  const { plan, error } = useMemo((): { plan: DietPlan | null; error: string | null } => {
    if (step < 3 || !body || !goalValid) return { plan: null, error: null };
    try {
      return {
        plan: generateDietPlan(foods, body, {
          lossLbs: num(lossLbs) ?? 0,
          durationDays: Math.round(num(days) ?? 49),
          protocol,
        }),
        error: null,
      };
    } catch (e) {
      return { plan: null, error: e instanceof DietPlanError ? e.message : "No se pudo generar el plan." };
    }
  }, [step, body, goalValid, foods, lossLbs, days, protocol]);

  const hasProtein = foods.some((f) => f.category === "protein");
  const canNext = step === 0 ? hasProtein : step === 1 ? Boolean(body) && goalValid : true;

  const endDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + Math.round(num(days) ?? 0));
    return d.toLocaleDateString("es", { day: "numeric", month: "long" });
  }, [days]);

  const save = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const nd = planToNewDiet(plan);
      const id = await createDiet(nd);
      if (activate) {
        await activateDiet({ ...nd, id, createdAt: new Date(), updatedAt: new Date() } as Diet);
      }
      toast({
        title: "Dieta guardada",
        description: activate ? "Ya está activa: tus metas del día se actualizaron." : "La tienes en Dietas.",
      });
      onSaved?.(id);
      onClose();
      setStep(0);
    } catch (e) {
      logger.error("diet builder save", e);
      toast({ title: "No se pudo guardar la dieta", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  const day = plan?.days[dayIndex];
  const t = plan?.targets;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      {/* Cabecera con progreso */}
      <header className="border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <EatyMark className="h-8 w-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Dieta con mis alimentos</p>
            <div className="mt-1.5 flex gap-1">
              {STEPS.map((s, i) => (
                <span key={s} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
              ))}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="mx-auto max-w-3xl px-4 pb-32 pt-6"
        >
          {step === 0 && (
            <>
              <StepHeader
                title="¿Qué vas a comer?"
                description="Elige los alimentos que tienes o quieres usar. El plan se arma solo con ellos."
              />
              <Button
                variant="secondary"
                className="mb-4 h-auto w-full justify-start whitespace-normal rounded-2xl py-2.5 text-left"
                onClick={() => setFoods(EXAMPLE_INGREDIENT_IDS.map((id) => getCatalogIngredient(id)!))}
              >
                <Sparkles className="h-4 w-4" />
                Cargar ejemplo: res, vacío, salmón, brócoli, huevos y mantequilla
              </Button>
              <IngredientPicker selected={foods} onChange={setFoods} />
              {!hasProtein && foods.length > 0 ? (
                <p className="mt-3 text-sm text-destructive">Elige al menos una proteína.</p>
              ) : null}
            </>
          )}

          {step === 1 && (
            <>
              <StepHeader title="Tu objetivo y tu cuerpo" description="Con esto calculamos tu gasto, el déficit y los macros." />

              <section className="surface p-5">
                <h3 className="font-semibold">Meta</h3>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Field label="Bajar" suffix="lb" value={lossLbs} onChange={setLossLbs} hint={`≈ ${Math.round(((num(lossLbs) ?? 0) / LB_PER_KG) * 10) / 10} kg`} />
                  <Field label="En" suffix="días" value={days} onChange={setDays} hint={`Hasta el ${endDate}`} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[4, 7, 8, 12].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setDays(String(w * 7))}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium",
                        num(days) === w * 7 ? "border-primary bg-primary text-primary-foreground" : "border-border"
                      )}
                    >
                      {w} semanas
                    </button>
                  ))}
                </div>
              </section>

              <section className="surface mt-4 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Datos corporales</h3>
                  <div className="flex rounded-full bg-muted p-0.5 text-xs font-medium">
                    {(["kg", "lb"] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => {
                          if (u === weightUnit) return;
                          const w = num(weight);
                          if (w) setWeight(String(Math.round((u === "lb" ? w * LB_PER_KG : w / LB_PER_KG) * 10) / 10));
                          setWeightUnit(u);
                        }}
                        className={cn("rounded-full px-3 py-1", weightUnit === u ? "bg-card shadow-sm" : "text-muted-foreground")}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <Field label="Peso" suffix={weightUnit} value={weight} onChange={setWeight} />
                  <Field label="Altura" suffix="cm" value={height} onChange={setHeight} />
                  <Field label="Edad" value={age} onChange={setAge} />
                </div>
                <div className="mt-3 flex gap-1.5">
                  {(
                    [
                      ["male", "Hombre"],
                      ["female", "Mujer"],
                      ["other", "Otro"],
                    ] as const
                  ).map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSex(v)}
                      className={cn(
                        "flex-1 rounded-full border px-3 py-2 text-sm font-medium",
                        sex === v ? "border-primary bg-primary text-primary-foreground" : "border-border"
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-sm font-medium">Actividad</p>
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {ACTIVITY.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setActivity(value)}
                      className={cn(
                        "flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[11px] font-medium",
                        activity === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="w-full truncate text-center">{label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="surface mt-4 p-5">
                <h3 className="font-semibold">Composición corporal (opcional)</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  De una báscula de bioimpedancia (InBody, Tanita…). Mejora la precisión de la TMB y la proteína.
                </p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <Field label="% grasa" suffix="%" value={bodyFat} onChange={setBodyFat} />
                  <Field label="Masa muscular" suffix={weightUnit} value={muscle} onChange={setMuscle} />
                  <Field label="TMB / BMR" suffix="kcal" value={bmr} onChange={setBmr} />
                </div>
              </section>
              {!body ? <p className="mt-3 text-sm text-destructive">Revisa peso, altura y edad.</p> : null}
            </>
          )}

          {step === 2 && (
            <>
              <StepHeader title="¿Cómo quieres comer?" description="Repartimos tus calorías entre las comidas del día." />
              <div role="radiogroup" aria-label="Protocolo" className="grid grid-cols-1 gap-2.5">
                {PROTOCOLS.map((p) => (
                  <OptionCard
                    key={p.value}
                    icon={p.icon}
                    label={MEAL_PROTOCOL_LABEL[p.value]}
                    description={p.description}
                    selected={protocol === p.value}
                    onSelect={() => setProtocol(p.value)}
                  />
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              {error ? (
                <div className="surface p-6 text-center">
                  <AlertTriangle className="mx-auto h-8 w-8 text-warning" />
                  <p className="mt-2 font-medium">{error}</p>
                </div>
              ) : plan && t && day ? (
                <>
                  <StepHeader
                    title="Tu plan"
                    description={`${MEAL_PROTOCOL_LABEL[protocol]} · ${foods.length} alimentos · 7 días de menú`}
                  />

                  {/* Metas */}
                  <section className="surface p-5">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="eyebrow">Meta diaria</p>
                        <p className="font-display text-4xl font-bold tabular">
                          {t.kcal}
                          <span className="ml-1 text-base font-normal text-muted-foreground">kcal</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {[
                          { l: "Proteína", v: t.protein, c: "bg-protein/12 text-protein" },
                          { l: "Grasa", v: t.fat, c: "bg-fat/12 text-fat" },
                          { l: "Carb. netos", v: t.netCarbs, c: "bg-carbs/15 text-carbs" },
                        ].map((m) => (
                          <div key={m.l} className={cn("rounded-xl px-3 py-2 text-center", m.c)}>
                            <p className="font-display text-lg font-bold tabular">{m.v} g</p>
                            <p className="text-[11px] opacity-80">{m.l}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        { l: "TMB", v: `${t.bmr} kcal`, s: t.bmrMethod === "measured" ? "medida" : t.bmrMethod === "katch_mcardle" ? "Katch-McArdle" : "Mifflin-St Jeor" },
                        { l: "Gasto (TDEE)", v: `${t.tdee} kcal`, s: "con tu actividad" },
                        { l: "Déficit", v: `${t.dailyDeficit} kcal/día`, s: `${t.weeklyLossLbs} lb por semana` },
                        { l: "Meta", v: t.projectedDays ? `~${t.projectedDays} días` : "Mantener", s: `masa magra ${t.leanMassKg} kg` },
                      ].map((s) => (
                        <div key={s.l} className="min-w-0 rounded-xl bg-muted/60 px-3 py-2">
                          <dt className="text-xs text-muted-foreground">{s.l}</dt>
                          <dd className="truncate text-sm font-semibold tabular">{s.v}</dd>
                          <dd className="truncate text-[11px] text-muted-foreground">{s.s}</dd>
                        </div>
                      ))}
                    </dl>
                    {t.warnings.length ? (
                      <ul className="mt-4 space-y-2">
                        {t.warnings.map((w) => (
                          <li
                            key={w.message}
                            className={cn(
                              "flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm",
                              w.level === "warning" ? "bg-warning/15" : "bg-muted/60 text-muted-foreground"
                            )}
                          >
                            {w.level === "warning" ? (
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            ) : (
                              <Info className="mt-0.5 h-4 w-4 shrink-0" />
                            )}
                            {w.message}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </section>

                  {/* Días */}
                  <div className="-mx-1 mt-5 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Día">
                    {plan.days.map((d, i) => (
                      <button
                        key={d.day}
                        type="button"
                        role="tab"
                        aria-selected={dayIndex === i}
                        onClick={() => setDayIndex(i)}
                        className={cn(
                          "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium",
                          dayIndex === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
                        )}
                      >
                        Día {d.day}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground tabular">
                    Total del día: {day.totals.kcal} kcal · P {day.totals.protein} g · G {day.totals.fat} g · C {day.totals.netCarbs} g
                  </p>

                  <ul className="mt-3 space-y-2.5">
                    {day.meals.map((m) => (
                      <li key={m.recipe.id}>
                        <button
                          type="button"
                          onClick={() => setOpenMeal(m)}
                          className="surface flex w-full items-start gap-3 p-4 text-left transition-colors hover:border-primary/40"
                        >
                          <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Clock className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs text-muted-foreground tabular">
                              {m.time} · {m.label}
                            </span>
                            <span className="mt-0.5 block font-medium leading-snug">{m.recipe.name}</span>
                            <span className="mt-1 block truncate text-xs text-muted-foreground tabular">
                              {m.recipe.ingredients.map((i) => `${i.grams} g ${i.name.toLowerCase()}`).join(" · ")}
                            </span>
                            <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs tabular">
                              <span className="font-semibold">{m.recipe.nutrition.kcal} kcal</span>
                              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-protein" />P {m.recipe.nutrition.protein} g</span>
                              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-fat" />G {m.recipe.nutrition.fat} g</span>
                              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-carbs" />C {m.recipe.nutrition.netCarbs} g</span>
                            </span>
                          </span>
                          <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>
                      </li>
                    ))}
                  </ul>

                  <label className="mt-5 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={activate}
                      onChange={(e) => setActivate(e.target.checked)}
                      className="h-4 w-4 accent-[var(--primary)]"
                    />
                    Activarla: usar estas metas en mi panel diario
                  </label>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Estimaciones orientativas, no sustituyen el consejo de un profesional de la salud.
                  </p>
                </>
              ) : (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </>
          )}
        </motion.div>
      </main>

      <footer className="border-t border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-3 px-4 py-3 pb-[max(env(safe-area-inset-bottom),12px)]">
          {step > 0 ? (
            <Button variant="outline" className="h-12 px-5" onClick={() => setStep(step - 1)} aria-label="Atrás">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          ) : null}
          {step < 3 ? (
            <Button className="h-12 flex-1 text-base" disabled={!canNext} onClick={() => setStep(step + 1)}>
              {step === 2 ? "Generar mi plan" : "Continuar"}
              <ChevronRight className="h-5 w-5" />
            </Button>
          ) : (
            <Button className="h-12 flex-1 text-base" disabled={!plan || saving} onClick={save}>
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              Guardar dieta
            </Button>
          )}
        </div>
      </footer>

      <RecipeDetail meal={openMeal} onOpenChange={(o) => !o && setOpenMeal(null)} />
    </div>
  );
}
