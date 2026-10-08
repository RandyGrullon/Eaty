import { NextResponse } from "next/server";
import { z } from "zod";
import { runDietGenerateGroq } from "@/lib/groq-server";
import {
  HttpApiError,
  withDailyQuota,
  requireUidFromRequest,
} from "@/lib/api-auth-usage";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const bodySchema = z.object({
  goal: z.string().max(60).optional(),
  calories: z.number().min(800).max(6000).optional(),
  preferences: z.string().max(400).optional(),
  restrictions: z.array(z.string().max(60)).max(20).optional(),
  lang: z.string().max(10).optional(),
});

export async function POST(req: Request) {
  try {
    const uid = await requireUidFromRequest(req);
    const body = bodySchema.parse(await req.json());

    // Reserva la cuota ANTES de llamar al LLM; se devuelve si la llamada falla.
    const diet = await withDailyQuota(uid, "diets", () =>
      runDietGenerateGroq({
        goal: body.goal,
        calories: body.calories,
        preferences: body.preferences,
        restrictions: body.restrictions,
        lang: body.lang,
      })
    );

    return NextResponse.json({ diet });
  } catch (e) {
    if (e instanceof HttpApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message =
      e instanceof z.ZodError
        ? e.issues.map((x) => x.message).join("; ")
        : e instanceof Error
          ? e.message
          : "Error al generar la dieta.";
    const status = e instanceof z.ZodError ? 400 : 500;
    if (!(e instanceof z.ZodError)) logger.error("diets-generate", e);
    return NextResponse.json({ error: message }, { status });
  }
}
