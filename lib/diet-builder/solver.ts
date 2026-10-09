/**
 * Reparto de gramos: mínimos cuadrados ponderados con límites (box-constrained
 * least squares) resuelto por descenso por coordenadas.
 *
 * Variables: gramos de cada alimento. Filas: proteína, grasa, carbohidratos netos
 * y kcal (escaladas). Cada variable queda entre la porción mínima y máxima
 * razonable, así el resultado siempre es un plato comible.
 */
import type { AllowedIngredient, MacroTotals } from "./types";

export type SolverTarget = { protein: number; fat: number; netCarbs: number; kcal: number };
export type SolverWeights = { protein: number; fat: number; netCarbs: number; kcal: number };

export const DEFAULT_WEIGHTS: SolverWeights = { protein: 4, fat: 1, netCarbs: 1, kcal: 2 };

/** kcal se divide entre 9 para que su error pese en la misma escala que gramos de grasa. */
const KCAL_SCALE = 1 / 9;

export function nutritionFor(ing: AllowedIngredient, grams: number): MacroTotals {
  const f = grams / 100;
  return {
    kcal: ing.per100g.kcal * f,
    protein: ing.per100g.protein * f,
    fat: ing.per100g.fat * f,
    netCarbs: ing.per100g.netCarbs * f,
    fiber: ing.per100g.fiber * f,
  };
}

export function sumNutrition(items: MacroTotals[]): MacroTotals {
  return items.reduce(
    (a, b) => ({
      kcal: a.kcal + b.kcal,
      protein: a.protein + b.protein,
      fat: a.fat + b.fat,
      netCarbs: a.netCarbs + b.netCarbs,
      fiber: a.fiber + b.fiber,
    }),
    { kcal: 0, protein: 0, fat: 0, netCarbs: 0, fiber: 0 }
  );
}

export function roundNutrition(n: MacroTotals): MacroTotals {
  return {
    kcal: Math.round(n.kcal),
    protein: Math.round(n.protein),
    fat: Math.round(n.fat),
    netCarbs: Math.round(n.netCarbs),
    fiber: Math.round(n.fiber),
  };
}

type Bounds = { min: number; max: number; step: number };

/**
 * Devuelve los gramos de cada alimento (redondeados a su paso) que mejor
 * cumplen el objetivo. `fixed` son contribuciones ya decididas (p. ej. verduras).
 */
export function solveGrams(
  foods: AllowedIngredient[],
  target: SolverTarget,
  options: { fixed?: MacroTotals; weights?: SolverWeights; bounds?: Bounds[]; iterations?: number } = {}
): number[] {
  const w = options.weights ?? DEFAULT_WEIGHTS;
  const fixed = options.fixed ?? { kcal: 0, protein: 0, fat: 0, netCarbs: 0, fiber: 0 };
  const bounds = options.bounds ?? foods.map((f) => f.portion);

  // Matriz A (filas = nutrientes, columnas = alimentos) por gramo.
  const rows: Array<{ coef: number[]; t: number; w: number }> = [
    { coef: foods.map((f) => f.per100g.protein / 100), t: target.protein - fixed.protein, w: w.protein },
    { coef: foods.map((f) => f.per100g.fat / 100), t: target.fat - fixed.fat, w: w.fat },
    { coef: foods.map((f) => f.per100g.netCarbs / 100), t: target.netCarbs - fixed.netCarbs, w: w.netCarbs },
    {
      coef: foods.map((f) => (f.per100g.kcal / 100) * KCAL_SCALE),
      t: (target.kcal - fixed.kcal) * KCAL_SCALE,
      w: w.kcal,
    },
  ];

  // Punto de partida: mitad del rango (evita sesgar hacia un alimento).
  const x = bounds.map((b) => (b.min + b.max) / 4 + b.min / 2);
  const clamp = (v: number, b: Bounds) => Math.min(b.max, Math.max(b.min, v));
  const residual = () => rows.map((r) => r.t - r.coef.reduce((s, c, j) => s + c * x[j], 0));

  // Pequeña regularización para preferir porciones moderadas cuando hay empate.
  const lambda = 1e-6;
  const iterations = options.iterations ?? 400;
  for (let it = 0; it < iterations; it++) {
    for (let j = 0; j < x.length; j++) {
      const res = residual();
      let num = 0;
      let den = lambda;
      for (let r = 0; r < rows.length; r++) {
        const a = rows[r].coef[j];
        num += rows[r].w * a * res[r];
        den += rows[r].w * a * a;
      }
      x[j] = clamp(x[j] + num / den, bounds[j]);
    }
  }

  return x.map((v, j) => {
    const b = bounds[j];
    const rounded = Math.round(v / b.step) * b.step;
    return clamp(rounded, b);
  });
}
