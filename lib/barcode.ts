import { logger } from "./logger";

export interface BarcodeProduct {
  foodName: string;
  brand?: string;
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
  };
  /** Tamaño de porción en gramos cuando esté disponible. */
  servingSizeGrams?: number;
  /** Valores nutricionales calculados para 1 ración (si se conoce). */
  perServing?: {
    calories: number;
    macros: {
      protein: number;
      carbs: number;
      fat: number;
      fiber?: number;
      sugar?: number;
    };
  };
  /** URL de la imagen del producto. */
  imageUrl?: string;
  /** Grado Nutri-Score (A-E) si el producto lo trae. */
  nutriScore?: "a" | "b" | "c" | "d" | "e";
  /** Etiqueta NOVA de procesamiento (1-4) si está disponible. */
  novaGroup?: 1 | 2 | 3 | 4;
  /** Categorías para mostrar (ej. "Bebidas, Refrescos"). */
  categories?: string;
  /** Lista de ingredientes en texto plano si la hay. */
  ingredientsText?: string;
}

type OFFNutriments = Record<string, number | string | undefined>;

function readNumber(nut: OFFNutriments, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = nut[k];
    if (v == null) continue;
    const n = typeof v === "string" ? parseFloat(v) : v;
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function parseServingSize(raw?: string | null): number | undefined {
  if (!raw) return undefined;
  // Formatos: "30 g", "240 ml", "1 unidad (45 g)"
  const m = raw.match(/(\d+[\.,]?\d*)\s*(g|ml)/i);
  if (!m) return undefined;
  const n = parseFloat(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function pickName(p: Record<string, unknown>): string {
  const candidates = [
    p.product_name_es,
    p.product_name,
    p.product_name_en,
    p.generic_name_es,
    p.generic_name,
    p.abbreviated_product_name,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c.trim();
  }
  return "Producto sin nombre";
}

function pickNutriScore(p: Record<string, unknown>): BarcodeProduct["nutriScore"] {
  const v = p.nutriscore_grade;
  if (typeof v === "string" && /^[a-e]$/i.test(v)) {
    return v.toLowerCase() as BarcodeProduct["nutriScore"];
  }
  return undefined;
}

function pickNova(p: Record<string, unknown>): BarcodeProduct["novaGroup"] {
  const v = p.nova_group;
  const n = typeof v === "string" ? parseInt(v, 10) : (v as number | undefined);
  if (n === 1 || n === 2 || n === 3 || n === 4) return n;
  return undefined;
}

/**
 * Busca un producto por código de barras usando Open Food Facts.
 * Devuelve datos por 100g/100ml y también calculados por porción cuando se conoce el tamaño.
 */
export async function getProductByBarcode(barcode: string): Promise<BarcodeProduct | null> {
  const cleaned = barcode.trim().replace(/\s/g, "");
  if (!/^\d{6,14}$/.test(cleaned)) {
    logger.warn("getProductByBarcode: formato inválido", { barcode });
    return null;
  }

  try {
    // Solicitamos solo los campos que necesitamos: respuesta más liviana y rápida.
    const fields = [
      "product_name", "product_name_es", "product_name_en",
      "generic_name", "generic_name_es",
      "abbreviated_product_name",
      "brands",
      "nutriments",
      "serving_size", "serving_quantity",
      "image_front_url", "image_url", "image_small_url",
      "nutriscore_grade", "nova_group",
      "categories",
      "ingredients_text", "ingredients_text_es", "ingredients_text_en",
    ].join(",");

    const url = `https://world.openfoodfacts.org/api/v2/product/${cleaned}.json?fields=${fields}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    // Sin cabecera User-Agent: en el navegador es una cabecera prohibida y,
    // al no ser "simple", forzaría un preflight CORS que Open Food Facts rechaza.
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      logger.warn("getProductByBarcode: status no OK", { status: res.status });
      return null;
    }

    const data = await res.json();
    if (data.status === 0 || !data.product) return null;

    const p = data.product as Record<string, unknown>;
    const nut = (p.nutriments as OFFNutriments) || {};

    // Por 100 g/ml
    const kcal100 =
      readNumber(nut, "energy-kcal_100g", "energy-kcal", "energy_100g") ?? 0;
    // OFF a veces devuelve energía en kJ en "energy_100g"; convertimos si solo tenemos eso.
    const hasOnlyKj =
      !readNumber(nut, "energy-kcal_100g", "energy-kcal") &&
      readNumber(nut, "energy_100g") != null;
    const kcal100Resolved = hasOnlyKj ? Math.round(kcal100 / 4.184) : Math.round(kcal100);

    const macros = {
      protein: round1(readNumber(nut, "proteins_100g", "proteins") ?? 0),
      carbs: round1(readNumber(nut, "carbohydrates_100g", "carbohydrates") ?? 0),
      fat: round1(readNumber(nut, "fat_100g", "fat") ?? 0),
      fiber: readNumber(nut, "fiber_100g", "fiber") != null
        ? round1(readNumber(nut, "fiber_100g", "fiber")!)
        : undefined,
      sugar: readNumber(nut, "sugars_100g", "sugars") != null
        ? round1(readNumber(nut, "sugars_100g", "sugars")!)
        : undefined,
    };

    // Tamaño de porción
    const servingFromQuantity = readNumber({ serving_quantity: p.serving_quantity as number | string | undefined }, "serving_quantity");
    const servingFromString = parseServingSize(p.serving_size as string | undefined);
    const servingSizeGrams = servingFromQuantity ?? servingFromString;

    let perServing: BarcodeProduct["perServing"] | undefined;
    if (servingSizeGrams && servingSizeGrams > 0) {
      const factor = servingSizeGrams / 100;
      perServing = {
        calories: Math.round(kcal100Resolved * factor),
        macros: {
          protein: round1(macros.protein * factor),
          carbs: round1(macros.carbs * factor),
          fat: round1(macros.fat * factor),
          fiber: macros.fiber != null ? round1(macros.fiber * factor) : undefined,
          sugar: macros.sugar != null ? round1(macros.sugar * factor) : undefined,
        },
      };
    }

    const imageUrl =
      (typeof p.image_front_url === "string" && p.image_front_url) ||
      (typeof p.image_url === "string" && p.image_url) ||
      (typeof p.image_small_url === "string" && p.image_small_url) ||
      undefined;

    const ingredientsText =
      (typeof p.ingredients_text_es === "string" && p.ingredients_text_es) ||
      (typeof p.ingredients_text === "string" && p.ingredients_text) ||
      (typeof p.ingredients_text_en === "string" && p.ingredients_text_en) ||
      undefined;

    return {
      foodName: pickName(p),
      brand: typeof p.brands === "string" && p.brands.trim() ? p.brands.split(",")[0].trim() : undefined,
      calories: kcal100Resolved,
      macros,
      servingSizeGrams,
      perServing,
      imageUrl: imageUrl || undefined,
      nutriScore: pickNutriScore(p),
      novaGroup: pickNova(p),
      categories: typeof p.categories === "string" ? p.categories : undefined,
      ingredientsText,
    };
  } catch (e) {
    logger.error("getProductByBarcode error", e);
    return null;
  }
}
