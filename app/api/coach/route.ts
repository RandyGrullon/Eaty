import { NextResponse } from "next/server";
import { z } from "zod";
import { runGroqChat } from "@/lib/groq-server";
import {
  HttpApiError,
  enforceDailyQuota,
  requireUidFromRequest,
} from "@/lib/api-auth-usage";
import { logger } from "@/lib/logger";
import {
  getSystemCoachChat,
  buildCoachUserPrompt,
} from "@/lib/food-analysis-prompts";

export const runtime = "nodejs";

const bodySchema = z.object({
  message: z.string().min(1).max(1000),
  mealsHistory: z.array(
    z.object({
      foodName: z.string(),
      calories: z.number(),
      macros: z.object({
        protein: z.number(),
        carbs: z.number(),
        fat: z.number(),
      }),
      createdAt: z.string(), // ISO string
    })
  ),
  dailyGoal: z.number().optional(),
  lang: z.string().max(10).optional(),
});

export async function POST(req: Request) {
  try {
    const uid = await requireUidFromRequest(req);
    const json: unknown = await req.json();
    const body = bodySchema.parse(json);

    const userPrompt = buildCoachUserPrompt({
      userMessage: body.message,
      mealsHistory: body.mealsHistory.map((m) => ({
        ...m,
        createdAt: new Date(m.createdAt),
      })),
      dailyGoal: body.dailyGoal,
    });

    const response = await runGroqChat({
      messages: [
        { role: "system", content: getSystemCoachChat(body.lang) },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 1024,
    });

    // Cuota separada o la misma de análisis? Usemos "analyze" por ahora o crea una nueva
    await enforceDailyQuota(uid, "analyze");

    return NextResponse.json({ response });
  } catch (e) {
    if (e instanceof HttpApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message =
      e instanceof z.ZodError
        ? e.issues.map((x) => x.message).join("; ")
        : e instanceof Error
          ? e.message
          : "Error en el Coach de IA.";
    const status = e instanceof z.ZodError ? 400 : 500;
    logger.error("api-coach", e);
    return NextResponse.json({ error: message }, { status });
  }
}
