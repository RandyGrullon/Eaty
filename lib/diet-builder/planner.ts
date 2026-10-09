/**
 * DietPlannerService: arma el plan a partir de los alimentos permitidos.
 *
 * 1. Calcula metas diarias (targets.ts).
 * 2. Reparte las kcal entre las comidas del protocolo (16/8, 3 o 4 comidas).
 * 3. Para cada comida elige alimentos SOLO de la lista del usuario, rotando para
 *    dar variedad (proteína distinta en cada comida del día cuando es posible).
 * 4. Fija las verduras y resuelve los gramos de proteína/carbohidrato/grasa con
 *    mínimos cuadrados con límites (solver.ts) para cuadrar macros y kcal.
 * 5. Construye la receta con su tutorial (recipes.ts).
 */
import { buildRecipe, type Component } from "./recipes";
import { DEFAULT_WEIGHTS, nutritionFor, roundNutrition, solveGrams, sumNutrition } from "./solver";
import { calculateTargets } from "./targets";
import type {
  AllowedIngredient,
  BodyMetrics,
  DayPlan,
  DietGoalInput,
  DietPlan,
  DietTargets,
  IngredientCategory,
  MacroTotals,
  MealProtocol,
  MealSlot,
  PlannedMeal,
  PlanWarning,
} from "./types";

type SlotDef = { label: string; time: string; share: number; slot: MealSlot };

export const PROTOCOL_SLOTS: Record<MealProtocol, SlotDef[]> = {
  if_16_8: [
    { label: "Comida 1 · rompe el ayuno", time: "13:00", share: 0.5, slot: "main" },
    { label: "Comida 2 · cierra la ventana", time: "20:00", share: 0.5, slot: "main" },
  ],
  three_meals: [
    { label: "Desayuno", time: "08:00", share: 0.3, slot: "breakfast" },
    { label: "Almuerzo", time: "13:30", share: 0.4, slot: "main" },
    { label: "Cena", time: "20:00", share: 0.3, slot: "main" },
  ],
  four_meals: [
    { label: "Desayuno", time: "08:00", share: 0.25, slot: "breakfast" },
    { label: "Almuerzo", time: "13:30", share: 0.35, slot: "main" },
    { label: "Merienda", time: "17:00", share: 0.15, slot: "snack" },
    { label: "Cena", time: "20:30", share: 0.25, slot: "main" },
  ],
};

export class DietPlanError extends Error {}

function byCategory(list: AllowedIngredient[], cat: IngredientCategory) {
  return list.filter((i) => i.category === cat);
}

/** Alimentos de una categoría aptos para el tipo de comida (con respaldo si no hay). */
function eligible(list: AllowedIngredient[], cat: IngredientCategory, slot: MealSlot, strict = false) {
  const all = byCategory(list, cat);
  const fit = all.filter((i) => i.slots.includes(slot));
  if (fit.length || strict) return fit;
  return all;
}

const pick = <T,>(arr: T[], i: number): T | undefined => (arr.length ? arr[((i % arr.length) + arr.length) % arr.length] : undefined);

export class DietPlannerService {
  constructor(
    private readonly ingredients: AllowedIngredient[],
    private readonly body: BodyMetrics,
    private readonly goal: DietGoalInput
  ) {
    if (byCategory(ingredients, "protein").length === 0) {
      throw new DietPlanError("Elige al menos una fuente de proteína (carne, pescado, huevos, yogur…).");
    }
  }

  targets(): DietTargets {
    return calculateTargets(this.body, this.goal, this.ingredients);
  }

  /** Plan de `days` días con rotación de alimentos. */
  build(days = 7): DietPlan {
    const targets = this.targets();
    const plan: DayPlan[] = [];
    for (let d = 0; d < days; d++) plan.push(this.buildDay(d, targets));

    const warnings: PlanWarning[] = [...targets.warnings];
    const avg = sumNutrition(plan.map((p) => p.totals));
    const avgKcal = avg.kcal / days;
    const avgProtein = avg.protein / days;
    if (Math.abs(avgKcal - targets.kcal) / targets.kcal > 0.08) {
      const lacks = byCategory(this.ingredients, "fat").length === 0 && avgKcal < targets.kcal;
      warnings.push({
        level: "warning",
        message: lacks
          ? `Con estos alimentos el plan queda en ~${Math.round(avgKcal)} kcal (meta ${targets.kcal}). Añade una grasa (mantequilla, aceite o aguacate) para completar la energía.`
          : `Con estos alimentos el plan queda en ~${Math.round(avgKcal)} kcal frente a una meta de ${targets.kcal}. Añade más variedad para afinarlo.`,
      });
    }
    if (avgProtein < targets.protein * 0.9) {
      warnings.push({
        level: "warning",
        message: `La proteína media (${Math.round(avgProtein)} g) queda por debajo de la meta (${targets.protein} g). Añade una proteína magra (pollo, claras, atún).`,
      });
    }

    return {
      goal: this.goal,
      body: this.body,
      targets: { ...targets, warnings },
      ingredients: this.ingredients,
      days: plan,
      createdAt: new Date().toISOString(),
    };
  }

  buildDay(dayIndex: number, targets: DietTargets = this.targets()): DayPlan {
    const slots = PROTOCOL_SLOTS[this.goal.protocol];
    const usedProteins = new Set<string>();
    const meals: PlannedMeal[] = slots.map((slotDef, mealIndex) => {
      const target: MacroTotals = {
        kcal: targets.kcal * slotDef.share,
        protein: targets.protein * slotDef.share,
        fat: targets.fat * slotDef.share,
        netCarbs: targets.netCarbs * slotDef.share,
        fiber: 0,
      };
      const components = this.composeMeal(slotDef, dayIndex, mealIndex, slots.length, usedProteins, targets.style, target.protein);
      const solved = this.solveMeal(components, target, slotDef.share, targets.style);
      const recipe = buildRecipe(`d${dayIndex + 1}-m${mealIndex + 1}`, slotDef.slot, solved);
      return {
        label: slotDef.label,
        time: slotDef.time,
        kcalShare: slotDef.share,
        target: roundNutrition(target),
        recipe,
      };
    });
    return {
      day: dayIndex + 1,
      meals,
      totals: roundNutrition(sumNutrition(meals.map((m) => m.recipe.nutrition))),
    };
  }

  /** Elige qué alimentos lleva la comida (sin gramos todavía). */
  private composeMeal(
    slotDef: SlotDef,
    dayIndex: number,
    mealIndex: number,
    mealsPerDay: number,
    usedToday: Set<string>,
    style: DietTargets["style"],
    proteinTarget: number
  ): AllowedIngredient[] {
    const { slot } = slotDef;
    // Índice de rotación continuo a lo largo de la semana.
    const rot = dayIndex * mealsPerDay + mealIndex;

    // Proteína: rota y evita repetir la misma en el día si hay alternativas.
    // En comidas principales, la protagonista es carne/pescado; el huevo, en desayuno.
    const allProteins = eligible(this.ingredients, "protein", slot);
    const isEgg = (i: AllowedIngredient) => /egg/.test(i.id);
    const nonEgg = allProteins.filter((p) => !isEgg(p));
    const proteins = slot === "main" && nonEgg.length ? nonEgg : allProteins;
    let protein = pick(proteins, rot)!;
    for (let k = 0; k < proteins.length && usedToday.has(protein.id); k++) {
      protein = pick(proteins, rot + k + 1)!;
    }
    usedToday.add(protein.id);

    const chosen: AllowedIngredient[] = [protein];

    // Si la proteína principal no llega a la meta con una porción razonable,
    // se acompaña de una segunda (preferiblemente huevo, una vez al día).
    const maxProtein = (protein.per100g.protein * protein.portion.max) / 100;
    if (maxProtein < proteinTarget * 0.95 || (slotDef.share >= 0.4 && (protein.per100g.fat / protein.per100g.protein) > 0.55)) {
      const egg = allProteins.find((p) => isEgg(p) && p.id !== protein.id);
      const other = pick(
        nonEgg.filter((p) => p.id !== protein.id && !usedToday.has(p.id)),
        rot + 1
      );
      const second = egg && !usedToday.has("__egg_side") ? egg : maxProtein < proteinTarget * 0.95 ? other : undefined;
      if (second) {
        chosen.push(second);
        usedToday.add(isEgg(second) ? "__egg_side" : second.id);
      }
    }

    // Verduras: 1 (o 2 en comidas grandes) en comidas principales; en desayuno solo si encajan.
    if (slot !== "snack") {
      const vegs = eligible(this.ingredients, "vegetable", slot, slot === "breakfast");
      const count = slotDef.share >= 0.35 && vegs.length >= 2 ? 2 : 1;
      for (let k = 0; k < Math.min(count, vegs.length); k++) chosen.push(pick(vegs, rot + k)!);
    }

    // Carbohidrato solo en estilo equilibrado.
    if (style === "balanced") {
      const carb = pick(eligible(this.ingredients, "carb", slot, slot !== "main"), rot);
      if (carb) chosen.push(carb);
    }

    // Grasa: para cocinar o como complemento.
    const fat = pick(eligible(this.ingredients, "fat", slot), dayIndex + mealIndex);
    if (fat) chosen.push(fat);

    return chosen;
  }

  /** Verduras fijas + solver para el resto. */
  private solveMeal(
    foods: AllowedIngredient[],
    target: MacroTotals,
    share: number,
    style: DietTargets["style"]
  ): Component[] {
    const vegs = foods.filter((f) => f.category === "vegetable");
    const rest = foods.filter((f) => f.category !== "vegetable");

    const vegGrams = vegs.map((v) => {
      const base = (vegs.length > 1 ? 110 : 160) * Math.min(1.4, Math.max(0.7, share / 0.35));
      const g = Math.round(base / v.portion.step) * v.portion.step;
      return Math.min(v.portion.max, Math.max(v.portion.min, g));
    });
    const fixed = sumNutrition(vegs.map((v, i) => nutritionFor(v, vegGrams[i])));

    // La proteína principal siempre lleva al menos su porción mínima.
    const bounds = rest.map((f, i) =>
      i === 0 ? { ...f.portion, min: Math.max(f.portion.min, 60) } : { ...f.portion, min: 0 }
    );
    const weights = style === "low_carb" ? { ...DEFAULT_WEIGHTS, netCarbs: 0.3 } : DEFAULT_WEIGHTS;
    const grams = solveGrams(rest, target, { fixed, bounds, weights });

    return [
      ...rest.map((ingredient, i) => ({ ingredient, grams: grams[i] })),
      ...vegs.map((ingredient, i) => ({ ingredient, grams: vegGrams[i] })),
    ];
  }
}

/** Atajo funcional. */
export function generateDietPlan(
  ingredients: AllowedIngredient[],
  body: BodyMetrics,
  goal: DietGoalInput,
  days = 7
): DietPlan {
  return new DietPlannerService(ingredients, body, goal).build(days);
}
