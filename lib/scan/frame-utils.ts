/** Utilidades puras para el escáner volumétrico en vivo. */

export interface VolumetricScanResult {
  foodName: string;
  calories: number;
  macros: { protein: number; carbs: number; fat: number; fiber?: number; sugar?: number };
  aiContext?: {
    confidence?: "low" | "medium" | "high";
    portionLabel?: string;
    containerType?: string;
    estimatedWeightGrams?: number;
    componentBreakdown?: Array<{ name: string; estimatedGrams?: number; calories?: number }>;
  };
  [k: string]: unknown;
}

// ─── Timing del loop volumétrico ──────────────────────────────────────────────
export const SCAN_INTERVAL_MS = 3500; // Mientras buscamos algo nuevo
export const SCAN_INTERVAL_STABLE_MS = 7000; // Una vez estabilizado
export const SCAN_INTERVAL_LOCKED_MS = 12000; // Cuando ya hay resultado de alta confianza
export const FIRST_SCAN_DELAY_MS = 1200; // Margen para que el usuario encuadre
export const MIN_SCAN_INTERVAL_MS = 2200; // Distancia mínima entre scans (anti-spam)
export const FRAME_HASH_DIFF_THRESHOLD = 9; // Bits distintos (de 64) para frame nuevo
export const STABLE_THRESHOLD = 2; // Nº de scans consecutivos coherentes → "estable"
export const MEANINGFUL_CAL_DELTA = 0.18; // 18% de variación en kcal → cambio significativo

export const PHASE_TEXTS = [
  "Mapeando volumen...",
  "Analizando densidad...",
  "Reconociendo ingredientes...",
  "Calibrando porción...",
];

/** Calcula un hash perceptual aHash 8x8 del video actual. Devuelve string de 64 bits. */
export function computeFrameHash(video: HTMLVideoElement): string | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 8;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, 8, 8);
  const data = ctx.getImageData(0, 0, 8, 8).data;
  const grays: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    grays.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }
  const mean = grays.reduce((a, b) => a + b, 0) / grays.length;
  return grays.map((g) => (g > mean ? "1" : "0")).join("");
}

export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

export function captureFrameAsFile(video: HTMLVideoElement): Promise<File | null> {
  return new Promise((resolve) => {
    if (!video.videoWidth || !video.videoHeight) return resolve(null);
    const c = document.createElement("canvas");
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return resolve(null);
    ctx.drawImage(video, 0, 0);
    c.toBlob(
      (blob) => {
        if (!blob) return resolve(null);
        resolve(new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
  });
}

function normalizeName(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

export function isMeaningfullyDifferent(
  prev: VolumetricScanResult,
  next: VolumetricScanResult
): boolean {
  if (normalizeName(prev.foodName) !== normalizeName(next.foodName)) return true;
  const calDiff = Math.abs(prev.calories - next.calories) / Math.max(1, prev.calories);
  return calDiff > MEANINGFUL_CAL_DELTA;
}

export function confidenceRank(c?: string): number {
  if (c === "high") return 2;
  if (c === "medium") return 1;
  return 0;
}

export function tryVibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
