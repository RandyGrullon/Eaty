import { NextResponse } from "next/server";
import { z } from "zod";
import { runDishTutorialGroq } from "@/lib/groq-server";
import {
  HttpApiError,
  enforceDailyQuota,
  requireUidFromRequest,
} from "@/lib/api-auth-usage";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const bodySchema = z.object({
  dishName: z.string().min(1).max(160),
  description: z.string().max(400).optional(),
  servings: z.number().int().min(1).max(20).optional(),
  lang: z.string().max(10).optional(),
});

export async function POST(req: Request) {
  try {
    const uid = await requireUidFromRequest(req);
    const body = bodySchema.parse(await req.json());

    const tutorial = await runDishTutorialGroq({
      dishName: body.dishName,
      description: body.description,
      servings: body.servings,
      lang: body.lang,
    });

    await enforceDailyQuota(uid, "tips");

    return NextResponse.json({ tutorial });
  } catch (e) {
    if (e instanceof HttpApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message =
      e instanceof z.ZodError
        ? e.issues.map((x) => x.message).join("; ")
        : e instanceof Error
          ? e.message
          : "Error al generar el tutorial.";
    const status = e instanceof z.ZodError ? 400 : 500;
    if (!(e instanceof z.ZodError)) logger.error("diets-tutorial", e);
    return NextResponse.json({ error: message }, { status });
  }
}
