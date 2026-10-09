/**
 * Metas diarias del Diet Builder: BMR, TDEE, déficit y reparto de macros.
 *
 * - BMR: medido (bmrOverride) > Katch-McArdle (si hay masa magra conocida) > Mifflin-St Jeor.
 * - Déficit: libras × 3500 kcal / días, limitado a ~1 % del peso corporal por semana
 *   y a un mínimo de kcal por sexo. Si la meta no cabe, se ajusta y se avisa.
 * - Proteína: 2,2 g por kg de masa magra (protege músculo en déficit).
 * - Grasa: mínimo 0,6 g/kg; en estilo low-carb cubre el resto de la energía.
 */
import type { AllowedIngredient, BodyMetrics, DietGoalInput, DietTargets, PlanWarning } from "./types";

export const KCAL_PER_LB = 3500;
const LB_PER_KG = 2.20462;

const ACTIVITY_FACTOR: Record<BodyMetrics["activityLevel"], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Masa magra estimada (kg). */
export function estimateLeanMassKg(body: BodyMetrics): number {
  if (body.bodyFatPct) return body.weightKg * (1 - body.bodyFatPct / 100);
  if (body.skeletalMuscleKg) {
    // En bioimpedancia la masa muscular esquelética suele ser ~56 % de la masa magra.
    return Math.min(body.skeletalMuscleKg / 0.56, body.weightKg * 0.92);
  }
  // Fórmula de Boer.
  const boer =
    body.sex === "female"
      ? 0.252 * body.weightKg + 0.473 * body.heightCm - 48.3
      : 0.407 * body.weightKg + 0.267 * body.heightCm - 19.2;
  return Math.min(Math.max(boer, body.weightKg * 0.5), body.weightKg * 0.9);
}

export function calculateBmr(body: BodyMetrics): { bmr: number; method: DietTargets["bmrMethod"]; leanMassKg: number } {
  const leanMassKg = estimateLeanMassKg(body);
  if (body.bmrOverride) return { bmr: body.bmrOverride, method: "measured", leanMassKg };
  if (body.bodyFatPct || body.skeletalMuscleKg) {
    return { bmr: 370 + 21.6 * leanMassKg, method: "katch_mcardle", leanMassKg };
  }
  const base = 10 * body.weightKg + 6.25 * body.heightCm - 5 * body.age;
  const bmr = body.sex === "male" ? base + 5 : body.sex === "female" ? base - 161 : base - 78;
  return { bmr, method: "mifflin", leanMassKg };
}

const round = (n: number, step = 1) => Math.round(n / step) * step;

export function calculateTargets(
  body: BodyMetrics,
  goal: DietGoalInput,
  ingredients: AllowedIngredient[]
): DietTargets {
  const warnings: PlanWarning[] = [];
  const { bmr, method, leanMassKg } = calculateBmr(body);
  const tdee = bmr * ACTIVITY_FACTOR[body.activityLevel];

  const requestedDeficit = (goal.lossLbs * KCAL_PER_LB) / goal.durationDays;
  // Ritmo máximo recomendado: 1 % del peso corporal por semana.
  const maxWeeklyLossLbs = body.weightKg * 0.01 * LB_PER_KG;
  const maxDeficitByRate = (maxWeeklyLossLbs * KCAL_PER_LB) / 7;
  const kcalFloor = body.sex === "female" ? 1200 : body.sex === "male" ? 1500 : 1350;
  const maxDeficitByFloor = Math.max(0, tdee - kcalFloor);
  const maxDeficit = Math.min(maxDeficitByRate, maxDeficitByFloor);

  let dailyDeficit = requestedDeficit;
  if (requestedDeficit > maxDeficit) {
    dailyDeficit = maxDeficit;
    const neededDays = Math.ceil((goal.lossLbs * KCAL_PER_LB) / Math.max(maxDeficit, 1));
    warnings.push({
      level: "warning",
      message: `Perder ${goal.lossLbs} lb en ${goal.durationDays} días exige un déficit de ${round(requestedDeficit)} kcal/día. Lo limitamos a ${round(maxDeficit)} kcal/día para proteger tu músculo y tu salud: llegarías a la meta en ~${neededDays} días.`,
    });
  }

  const kcal = round(tdee - dailyDeficit, 10);

  // Estilo: sin fuentes de carbohidrato elegidas → low-carb (solo verduras).
  const hasCarbSource = ingredients.some((i) => i.category === "carb");
  const style: DietTargets["style"] = hasCarbSource ? "balanced" : "low_carb";

  // Proteína: 2,2 g por kg de masa magra (≈1 g por lb magra), mínimo 90 g.
  const protein = round(Math.max(2.2 * leanMassKg, 90), 5);
  const proteinKcal = protein * 4;

  let fat: number;
  let netCarbs: number;
  if (style === "low_carb") {
    // Carbohidratos solo de verduras (~30–50 g netos); la grasa completa la energía.
    netCarbs = 35;
    fat = round(Math.max((kcal - proteinKcal - netCarbs * 4) / 9, 0.6 * body.weightKg), 5);
  } else {
    fat = round(Math.max((kcal * 0.3) / 9, 0.6 * body.weightKg), 5);
    netCarbs = round(Math.max((kcal - proteinKcal - fat * 9) / 4, 50), 5);
  }

  if (proteinKcal > kcal * 0.6) {
    warnings.push({
      level: "info",
      message: "Tu meta de proteína es alta respecto a las calorías: la grasa queda en el mínimo saludable.",
    });
  }

  const weeklyLossLbs = (dailyDeficit * 7) / KCAL_PER_LB;
  const projectedDays = dailyDeficit > 0 ? Math.ceil((goal.lossLbs * KCAL_PER_LB) / dailyDeficit) : 0;

  if (goal.lossLbs > 0 && body.bmrOverride === undefined && !body.bodyFatPct && !body.skeletalMuscleKg) {
    warnings.push({
      level: "info",
      message: "Añade tu % de grasa o masa muscular (báscula de bioimpedancia) para afinar la TMB y la proteína.",
    });
  }

  return {
    bmr: round(bmr),
    bmrMethod: method,
    leanMassKg: Math.round(leanMassKg * 10) / 10,
    tdee: round(tdee),
    dailyDeficit: round(dailyDeficit),
    kcal,
    protein,
    fat,
    netCarbs,
    weeklyLossLbs: Math.round(weeklyLossLbs * 10) / 10,
    projectedDays,
    style,
    warnings,
  };
}
