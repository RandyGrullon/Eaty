import { NextResponse } from "next/server";
import { generateDishImage, DishImageError } from "@/lib/dish-image-server";

export const runtime = "nodejs";
/** La cola anónima de Pollinations puede tardar; damos margen a los reintentos. */
export const maxDuration = 60;

/**
 * GET /api/dish-image?p=<prompt>&s=<seed>
 * Genera (o devuelve de caché) la imagen IA de un plato. Es pública para poder
 * usarse en `<img src>`; el prompt se acota y siempre se fuerza a fotografía de comida.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const prompt = (url.searchParams.get("p") ?? "").trim();
  const seed = Number.parseInt(url.searchParams.get("s") ?? "0", 10);

  if (prompt.length < 2 || prompt.length > 600 || !Number.isFinite(seed)) {
    return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
  }

  try {
    const { bytes, contentType } = await generateDishImage(prompt, seed);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        // Misma entrada → misma imagen: la CDN puede guardarla indefinidamente.
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch (e) {
    const status = e instanceof DishImageError ? e.status : 502;
    const message = e instanceof Error ? e.message : "No se pudo generar la imagen.";
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
