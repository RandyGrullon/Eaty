import { NextResponse } from "next/server";
import { z } from "zod";
import { runDietProcessGroq } from "@/lib/groq-server";
import {
  HttpApiError,
  enforceDailyQuota,
  requireUidFromRequest,
} from "@/lib/api-auth-usage";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().max(120).optional(),
  description: z.string().max(600).optional(),
  goal: z.string().max(60).optional(),
  dishes: z
    .array(
      z.object({
        name: z.string().min(1).max(160),
        type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        description: z.string().max(400).optional(),
      })
    )
    .min(1)
    .max(12),
  lang: z.string().max(10).optional(),
});

export async function POST(req: Request) {
  try {
    const uid = await requireUidFromRequest(req);
    const body = bodySchema.parse(await req.json());

    const diet = await runDietProcessGroq({
      name: body.name,
      description: body.description,
      goal: body.goal,
      dishes: body.dishes,
      lang: body.lang,
    });

    await enforceDailyQuota(uid, "analyze");

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
          : "Error al procesar la dieta.";
    const status = e instanceof z.ZodError ? 400 : 500;
    if (!(e instanceof z.ZodError)) logger.error("diets-process", e);
    return NextResponse.json({ error: message }, { status });
  }
}
