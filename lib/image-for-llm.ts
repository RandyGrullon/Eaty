const DEFAULT_MAX_EDGE = 1280;
const DEFAULT_MAX_BASE64_CHARS = 3_200_000;

function extensionMime(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

/**
 * Normaliza MIME y reduce tamaño para cumplir límites de Groq (~4MB base64).
 * Solo ejecutar en el navegador (usa Canvas).
 */
export async function prepareImageForGroq(
  file: File,
  options?: { maxEdge?: number; maxBase64Chars?: number }
): Promise<{ base64WithoutPrefix: string; mimeType: string }> {
  const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE;
  const maxBase64Chars = options?.maxBase64Chars ?? DEFAULT_MAX_BASE64_CHARS;

  let mimeType =
    file.type && file.type.startsWith("image/")
      ? file.type
      : extensionMime(file.name);

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("No se pudo preparar la imagen para el análisis.");
  }

  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  let quality = 0.88;
  let blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
  );

  if (!blob) {
    throw new Error("No se pudo codificar la imagen.");
  }

  mimeType = "image/jpeg";

  const readBase64 = (): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const idx = dataUrl.indexOf(",");
        resolve(idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl);
      };
      reader.onerror = () => reject(new Error("Error al leer la imagen."));
      reader.readAsDataURL(blob as Blob);
    });

  let base64WithoutPrefix = await readBase64();

  while (
    base64WithoutPrefix.length > maxBase64Chars &&
    quality > 0.45
  ) {
    quality -= 0.08;
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
    );
    if (!blob) break;
    base64WithoutPrefix = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const idx = dataUrl.indexOf(",");
        resolve(idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl);
      };
      reader.onerror = () => reject(new Error("Error al leer la imagen."));
      reader.readAsDataURL(blob as Blob);
    });
  }

  return { base64WithoutPrefix, mimeType };
}
