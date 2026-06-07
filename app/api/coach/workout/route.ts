import { NextResponse } from "next/server";
import { z } from "zod";
import { runWorkoutGroq } from "@/lib/groq-server";
import {
  HttpApiError,
  enforceDailyQuota,
  requireUidFromRequest,
} from "@/lib/api-auth-usage";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const bodySchema = z.object({
  goal: z.enum(["bulking", "shedding", "maintenance"]).optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  daysPerWeek: z.number().int().min(1).max(7).default(3),
  equipment: z.array(z.string().max(80)).max(20).optional(),
  focus: z.string().max(120).optional(),
  lang: z.string().max(10).optional(),
});

export async function POST(req: Request) {
  try {
    const uid = await requireUidFromRequest(req);
    const body = bodySchema.parse(await req.json());

    const workout = await runWorkoutGroq({
      goal: body.goal,
      level: body.level,
      daysPerWeek: body.daysPerWeek,
      equipment: body.equipment,
      focus: body.focus,
      lang: body.lang,
    });

    await enforceDailyQuota(uid, "analyze");

    return NextResponse.json({ workout });
  } catch (e) {
    if (e instanceof HttpApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message =
      e instanceof z.ZodError
        ? e.issues.map((x) => x.message).join("; ")
        : e instanceof Error
          ? e.message
          : "Error al generar la rutina.";
    const status = e instanceof z.ZodError ? 400 : 500;
    if (!(e instanceof z.ZodError)) logger.error("coach-workout", e);
    return NextResponse.json({ error: message }, { status });
  }
}
