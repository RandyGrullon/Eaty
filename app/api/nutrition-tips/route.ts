import { NextResponse } from "next/server";
import { z } from "zod";
import { runNutritionTipsGroq } from "@/lib/groq-server";

export const runtime = "nodejs";

const mealSchema = z.object({
  foodName: z.string(),
  calories: z.number(),
  macros: z.object({
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }),
});

const bodySchema = z.object({
  meals: z.array(mealSchema),
  totalCalories: z.number(),
  dailyGoal: z.number().optional(),
  recentSummary: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const body = bodySchema.parse(json);

    const tips = await runNutritionTipsGroq({
      meals: body.meals,
      totalCalories: body.totalCalories,
      dailyGoal: body.dailyGoal,
      recentSummary: body.recentSummary,
    });

    return NextResponse.json({ tips });
  } catch (e) {
    const message =
      e instanceof z.ZodError
        ? e.issues.map((x) => x.message).join("; ")
        : e instanceof Error
          ? e.message
          : "Error al generar consejos.";
    const status = e instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
