import { NextResponse } from "next/server";
import { z } from "zod";
import { runCoachInsightsGroq } from "@/lib/groq-server";
import {
  HttpApiError,
  withDailyQuota,
  requireUidFromRequest,
} from "@/lib/api-auth-usage";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const bodySchema = z.object({
  context: z
    .object({
      fitnessGoal: z.enum(["bulking", "shedding", "maintenance"]).optional(),
      weightKg: z.number().optional(),
      dailyGoal: z.number().optional(),
      consumedToday: z.number().optional(),
      weeklyAvgCalories: z.number().optional(),
      activeDietName: z.string().max(120).optional(),
    })
    .optional(),
  todayMeals: z
    .array(
      z.object({ foodName: z.string(), calories: z.number() })
    )
    .max(30),
  remainingCalories: z.number().optional(),
  remainingProtein: z.number().optional(),
  lang: z.string().max(10).optional(),
});

export async function POST(req: Request) {
  try {
    const uid = await requireUidFromRequest(req);
    const body = bodySchema.parse(await req.json());

    // Reserva la cuota ANTES de llamar al LLM; se devuelve si la llamada falla.
    const insight = await withDailyQuota(uid, "coach", () =>
      runCoachInsightsGroq({
        context: body.context,
        todayMeals: body.todayMeals,
        remainingCalories: body.remainingCalories,
        remainingProtein: body.remainingProtein,
        lang: body.lang,
      })
    );

    return NextResponse.json({ insight });
  } catch (e) {
    if (e instanceof HttpApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message =
      e instanceof z.ZodError
        ? e.issues.map((x) => x.message).join("; ")
        : e instanceof Error
          ? e.message
          : "Error al generar el resumen del coach.";
    const status = e instanceof z.ZodError ? 400 : 500;
    if (!(e instanceof z.ZodError)) logger.error("coach-insights", e);
    return NextResponse.json({ error: message }, { status });
  }
}
