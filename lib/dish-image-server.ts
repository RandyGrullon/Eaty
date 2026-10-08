import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { logger } from "@/lib/logger";

export class DishImageError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "DishImageError";
  }
}

type CachedImage = { bytes: Buffer; contentType: string };

const CACHE_LIMIT = 60;
const cache = new Map<string, CachedImage>();
const inFlight = new Map<string, Promise<CachedImage>>();

/** Pollinations anónimo admite ~1 petición a la vez por IP: serializamos. */
let queue: Promise<unknown> = Promise.resolve();

const TOTAL_BUDGET_MS = 50_000;
const REQUEST_TIMEOUT_MS = 40_000;

function serverKey(): string | undefined {
  return (
    process.env.POLLINATIONS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_POLLINATIONS_TOKEN?.trim() ||
    undefined
  );
}

function providerUrl(prompt: string, seed: number, key?: string): string {
  const params = new URLSearchParams({
    width: "768",
    height: "768",
    nologo: "true",
    model: "flux",
    seed: String(seed),
  });
  const encoded = encodeURIComponent(prompt);
  if (key) {
    params.set("key", key);
    return `https://gen.pollinations.ai/image/${encoded}?${params.toString()}`;
  }
  return `https://image.pollinations.ai/prompt/${encoded}?${params.toString()}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchOnce(prompt: string, seed: number, key?: string): Promise<CachedImage | number> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(providerUrl(prompt, seed, key), {
      signal: controller.signal,
      headers: key ? { Authorization: `Bearer ${key}` } : undefined,
      cache: "no-store",
    });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) return res.status || 502;
    return { bytes: Buffer.from(await res.arrayBuffer()), contentType: type };
  } finally {
    clearTimeout(timer);
  }
}

async function generateWithRetry(prompt: string, seed: number, deadline: number): Promise<CachedImage> {
  const key = serverKey();
  let attempt = 0;
  let lastStatus = 0;

  while (Date.now() < deadline) {
    attempt += 1;
    try {
      const out = await fetchOnce(prompt, seed, key);
      if (typeof out !== "number") return out;
      lastStatus = out;
      // Con clave, un 401/403 no se arregla reintentando: probamos sin clave.
      if (key && (out === 401 || out === 403)) {
        const anon = await fetchOnce(prompt, seed);
        if (typeof anon !== "number") return anon;
        lastStatus = anon;
      }
      if (out === 400) break;
    } catch (e) {
      lastStatus = 504;
      logger.error("dish-image fetch", e instanceof Error ? e.message : e);
    }
    // 402 = cola anónima llena: esperar y reintentar con backoff suave.
    await sleep(Math.min(3_000 + attempt * 1_500, 8_000, Math.max(0, deadline - Date.now())));
  }

  throw new DishImageError(
    lastStatus === 400 ? 400 : 503,
    "El generador de imágenes está saturado. Inténtalo de nuevo en unos segundos."
  );
}

/** Caché en disco (tmp): sobrevive a reinicios del servidor y comparte entre peticiones. */
const DISK_DIR = path.join(tmpdir(), "eaty-dish-images");

function diskPath(id: string): string {
  return path.join(DISK_DIR, createHash("sha1").update(id).digest("hex") + ".jpg");
}

async function readDisk(id: string): Promise<CachedImage | null> {
  try {
    return { bytes: await readFile(diskPath(id)), contentType: "image/jpeg" };
  } catch {
    return null;
  }
}

async function writeDisk(id: string, img: CachedImage): Promise<void> {
  try {
    await mkdir(DISK_DIR, { recursive: true });
    await writeFile(diskPath(id), img.bytes);
  } catch (e) {
    logger.error("dish-image disk cache", e instanceof Error ? e.message : e);
  }
}

/** Imagen IA del plato (prompt + semilla), con caché en memoria/disco y cola serializada. */
export async function generateDishImage(prompt: string, seed: number): Promise<CachedImage> {
  const id = `${seed}:${prompt}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const pending = inFlight.get(id);
  if (pending) return pending;
  const fromDisk = await readDisk(id);
  if (fromDisk) {
    cache.set(id, fromDisk);
    return fromDisk;
  }

  // El plazo cuenta desde que llega la petición (incluida la espera en cola).
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const job = queue.then(() => generateWithRetry(prompt, seed, deadline));
  queue = job.catch(() => undefined);
  const tracked = job
    .then((img) => {
      cache.set(id, img);
      void writeDisk(id, img);
      if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
      return img;
    })
    .finally(() => inFlight.delete(id));
  inFlight.set(id, tracked);
  return tracked;
}
