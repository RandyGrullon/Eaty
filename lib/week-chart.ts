import type { Meal } from "@/types/meal";

export type DayBar = {
  /** Inicio del día local. */
  date: Date;
  calories: number;
  meals: number;
  isToday: boolean;
};

/** Calorías por día de los últimos `days` días (incluido hoy), sin comidas planificadas. */
export function deriveLastDays(meals: Meal[], days = 7, now: Date = new Date()): DayBar[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const bars: DayBar[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    bars.push({ date, calories: 0, meals: 0, isToday: i === 0 });
  }

  const first = bars[0].date.getTime();
  for (const meal of meals) {
    if (meal.isPlanned) continue;
    const t = meal.createdAt.getTime();
    if (t < first || t > now.getTime() + 86_400_000) continue;
    const day = new Date(meal.createdAt);
    day.setHours(0, 0, 0, 0);
    const bar = bars.find((b) => b.date.getTime() === day.getTime());
    if (bar) {
      bar.calories += meal.calories || 0;
      bar.meals += 1;
    }
  }
  return bars;
}
