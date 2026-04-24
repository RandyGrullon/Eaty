import { NextResponse } from "next/server";
import { z } from "zod";
import { runFoodAnalysisGroq } from "@/lib/groq-server";
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
    await enforceDailyQuota(uid, "analyze");

    const json: unknown = await req.json();
    const body = bodySchema.parse(json);

    const result = await runFoodAnalysisGroq({
      imageBase64: body.imageBase64?.trim(),
      imageMimeType: body.imageMimeType?.trim(),
      foodName: body.foodName?.trim(),
      description: body.description?.trim(),
    });

    return NextResponse.json(result);
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
          : "Error al analizar la comida.";
    const status = e instanceof z.ZodError ? 400 : 500;
    if (!(e instanceof z.ZodError)) {
      logger.error("analyze-food", e);
    }
    return NextResponse.json({ error: message }, { status });
  }
}
