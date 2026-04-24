import { NextResponse } from "next/server";
import { z } from "zod";
import { runNutritionTipsGroq } from "@/lib/groq-server";
import {
  HttpApiError,
  enforceDailyQuota,
  requireUidFromRequest,
} from "@/lib/api-auth-usage";
import { logger } from "@/lib/logger";

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
    const uid = await requireUidFromRequest(req);
    await enforceDailyQuota(uid, "tips");

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
    if (e instanceof HttpApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (
      e instanceof Error &&
      (e.message.includes("FIREBASE_SERVICE_ACCOUNT_JSON") ||
        e.message.includes("GOOGLE_APPLICATION_CREDENTIALS") ||
        e.message.includes("Configura FIREBASE"))
    ) {
      logger.error("Firebase Admin no configurado", e.message);
      return NextResponse.json(
        {
          error:
            "Servidor sin credenciales de administrador. Configura FIREBASE_SERVICE_ACCOUNT_JSON.",
        },
        { status: 503 }
      );
    }
    const message =
      e instanceof z.ZodError
        ? e.issues.map((x) => x.message).join("; ")
        : e instanceof Error
          ? e.message
          : "Error al generar consejos.";
    const status = e instanceof z.ZodError ? 400 : 500;
    if (!(e instanceof z.ZodError)) {
      logger.error("nutrition-tips", e);
    }
    return NextResponse.json({ error: message }, { status });
  }
}
