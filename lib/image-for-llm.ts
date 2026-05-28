/**
 * Pipeline de preparación de imagen para análisis con Groq Vision.
 *
 * Objetivos:
 * - Resolución suficiente para que el modelo distinga ingredientes/etiquetas (1536 px lado mayor).
 * - Orientación EXIF respetada (rotaciones del móvil).
 * - Compresión inteligente por bisección de calidad (más detalle por byte).
 * - Mantener cabida en el límite del proveedor (~4 MB base64).
 */

const DEFAULT_MAX_EDGE = 1536;
const FALLBACK_MAX_EDGE = 1280;
const DEFAULT_MAX_BASE64_CHARS = 3_400_000;
const TARGET_OPTIMAL_BASE64_CHARS = 2_400_000;
const MIN_QUALITY = 0.55;
const MAX_QUALITY = 0.92;

function extensionMime(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  return "image/jpeg";
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const idx = dataUrl.indexOf(",");
      resolve(idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl);
    };
    reader.onerror = () => reject(new Error("Error al leer la imagen."));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
  );
}

/**
 * Decodifica con `createImageBitmap` y corrige la orientación EXIF cuando esté disponible.
 * Si el navegador no soporta `imageOrientation`, retorna el bitmap normal.
 */
async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    // Chrome / Edge / Firefox modernos: aplica EXIF automáticamente.
    return await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch {
    return await createImageBitmap(file);
  }
}

/**
 * Bisección entre [MIN_QUALITY, MAX_QUALITY]: busca la calidad más alta que cabe
 * dentro de `maxBase64`. Si ya cabe con MAX_QUALITY, retorna esa.
 */
async function compressByBinarySearch(
  canvas: HTMLCanvasElement,
  maxBase64: number,
  optimalBase64: number
): Promise<{ base64: string; quality: number }> {
  // Primer intento: calidad alta.
  let topBlob = await canvasToBlob(canvas, MAX_QUALITY);
  if (!topBlob) throw new Error("No se pudo codificar la imagen.");
  let topB64 = await blobToBase64(topBlob);
  if (topB64.length <= optimalBase64) {
    return { base64: topB64, quality: MAX_QUALITY };
  }

  // Bisección
  let lo = MIN_QUALITY;
  let hi = MAX_QUALITY;
  let bestBase64 = topB64;
  let bestQuality = MAX_QUALITY;
  let bestFits = topB64.length <= maxBase64;

  for (let iter = 0; iter < 6; iter++) {
    const mid = +((lo + hi) / 2).toFixed(2);
    const blob = await canvasToBlob(canvas, mid);
    if (!blob) break;
    const b64 = await blobToBase64(blob);

    if (b64.length <= maxBase64) {
      // Cabe → intentar subir calidad
      bestBase64 = b64;
      bestQuality = mid;
      bestFits = true;
      lo = mid;
    } else {
      // Demasiado grande → bajar calidad
      hi = mid;
    }

    // Si encontramos algo cercano al óptimo, salimos.
    if (b64.length <= optimalBase64 && b64.length > optimalBase64 * 0.85) {
      bestBase64 = b64;
      bestQuality = mid;
      bestFits = true;
      break;
    }
  }

  if (!bestFits) {
    // Última pasada con MIN_QUALITY.
    const lowBlob = await canvasToBlob(canvas, MIN_QUALITY);
    if (lowBlob) {
      bestBase64 = await blobToBase64(lowBlob);
      bestQuality = MIN_QUALITY;
    }
  }

  return { base64: bestBase64, quality: bestQuality };
}

/**
 * Normaliza MIME y reduce tamaño para cumplir el límite de Groq (~4MB base64).
 * Aplica corrección EXIF, redimensiona al lado mayor objetivo y comprime por bisección.
 * Solo ejecutar en el navegador (usa Canvas).
 */
export async function prepareImageForGroq(
  file: File,
  options?: { maxEdge?: number; maxBase64Chars?: number }
): Promise<{ base64WithoutPrefix: string; mimeType: string }> {
  const requestedMaxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE;
  const maxBase64Chars = options?.maxBase64Chars ?? DEFAULT_MAX_BASE64_CHARS;
  const optimalBase64 = Math.min(maxBase64Chars, TARGET_OPTIMAL_BASE64_CHARS);

  // Heurística para imágenes muy pesadas (>8MB): empezar más chico.
  let targetMaxEdge = requestedMaxEdge;
  if (file.size > 8 * 1024 * 1024) targetMaxEdge = FALLBACK_MAX_EDGE;

  let bitmap: ImageBitmap;
  try {
    bitmap = await decodeImage(file);
  } catch (e) {
    throw new Error(
      "No se pudo abrir la imagen. Si es HEIC (iPhone), conviértela a JPG primero."
    );
  }

  const { width, height } = bitmap;
  const scale = Math.min(1, targetMaxEdge / Math.max(width, height));
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

  // Mejor calidad de remuestreo para imágenes de comida.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  let result = await compressByBinarySearch(canvas, maxBase64Chars, optimalBase64);

  // Plan B: si aún no cabe (imagen extremadamente compleja), reducir lado mayor un 80%.
  if (result.base64.length > maxBase64Chars && targetMaxEdge > 960) {
    const shrunk = Math.max(960, Math.round(targetMaxEdge * 0.8));
    const c2 = document.createElement("canvas");
    c2.width = Math.round(targetW * (shrunk / targetMaxEdge));
    c2.height = Math.round(targetH * (shrunk / targetMaxEdge));
    const ctx2 = c2.getContext("2d");
    if (ctx2) {
      ctx2.imageSmoothingEnabled = true;
      ctx2.imageSmoothingQuality = "high";
      ctx2.drawImage(canvas, 0, 0, c2.width, c2.height);
      result = await compressByBinarySearch(c2, maxBase64Chars, optimalBase64);
    }
  }

  if (!result.base64) {
    throw new Error("No se pudo comprimir la imagen al tamaño requerido.");
  }

  return { base64WithoutPrefix: result.base64, mimeType: "image/jpeg" };
}

// Silenciar warning de variable no usada cuando el tipo extiende.
type _Suppress = typeof extensionMime;
