import { NextResponse } from "next/server";
import { z } from "zod";
import { runFoodAnalysisGroq } from "@/lib/groq-server";

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
    const message =
      e instanceof z.ZodError
        ? e.issues.map((x) => x.message).join("; ")
        : e instanceof Error
          ? e.message
          : "Error al analizar la comida.";
    const status = e instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
