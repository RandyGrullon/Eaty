import { z } from "zod";

/** Resumen accionable del panel "Hoy" del coach (generado por IA). */
export const coachInsightSchema = z.object({
  focusTitle: z.string().min(2).max(80),
  focusMessage: z.string().min(8).max(600),
  nextMeal: z.object({
    title: z.string().min(2).max(80),
    idea: z.string().min(4).max(400),
    approxCalories: z.number().min(0).max(3000).optional(),
  }),
  training: z.object({
    title: z.string().min(2).max(80),
    idea: z.string().min(4).max(400),
  }),
  motivation: z.string().min(2).max(200),
});

export type CoachInsight = z.infer<typeof coachInsightSchema>;
