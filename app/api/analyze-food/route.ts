import { NextResponse } from "next/server";
import { z } from "zod";
import { FoodAnalysisExhaustedError, runFoodAnalysisGroq } from "@/lib/groq-server";
import {
  HttpApiError,
  enforceDailyQuota,
  requireUidFromRequest,
} from "@/lib/api-auth-usage";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    imageBase64: z.string().min(1).optional(),
    imageMimeType: z.string().min(3).max(80).optional(),
    foodName: z.string().max(200).optional(),
    description: z.string().max(2000).optional(),
  })
  .refine(
    (b) =>
      Boolean(b.imageBase64?.trim()) ||
      Boolean(b.foodName?.trim()) ||
      Boolean(b.description?.trim()),
    { message: "Se requiere imagen, nombre o descripción." }
  );

export async function POST(req: Request) {
  try {
    const uid = await requireUidFromRequest(req);

    const json: unknown = await req.json();
    const body = bodySchema.parse(json);

    const result = await runFoodAnalysisGroq({
      imageBase64: body.imageBase64?.trim(),
      imageMimeType: body.imageMimeType?.trim(),
      foodName: body.foodName?.trim(),
      description: body.description?.trim(),
    });

    await enforceDailyQuota(uid, "analyze");

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof HttpApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof FoodAnalysisExhaustedError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    if (
      e instanceof Error &&
      (e.message.includes("FIREBASE_SERVICE_ACCOUNT_JSON") ||
        e.message.includes("GOOGLE_APPLICATION_CREDENTIALS") ||
        e.message.includes("cuenta de servicio") ||
        e.message.includes("Configura FIREBASE"))
    ) {
      logger.error("Firebase Admin no configurado", e.message);
      return NextResponse.json(
        {
          error: e.message.startsWith("FIREBASE_")
            ? e.message
            : "Falta credencial de servicio. En Firebase: Project settings > Service accounts, genera la clave JSON, una línea en .env: FIREBASE_SERVICE_ACCOUNT_JSON=... (mismo proyecto que NEXT_PUBLIC_FIREBASE_PROJECT_ID). Luego reinicia pnpm dev.",
        },
        { status: 503 }
      );
    }
    const message =
      e instanceof z.ZodError
        ? e.issues.map((x) => x.message).join("; ")
        : e instanceof Error
          ? e.message
          : "Error al analizar la comida.";
    const status = e instanceof z.ZodError ? 400 : 500;
    if (!(e instanceof z.ZodError)) {
      logger.error("analyze-food", e);
    }
    return NextResponse.json({ error: message }, { status });
  }
}
