import { logger } from "./logger";

export interface BarcodeProduct {
  foodName: string;
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

/**
 * Busca un producto por código de barras usando la API de Open Food Facts.
 */
export async function getProductByBarcode(barcode: string): Promise<BarcodeProduct | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );
    const data = await res.json();

    if (data.status === 0 || !data.product) {
      return null;
    }

    const p = data.product;
    const nut = p.nutriments || {};

    // Open Food Facts devuelve valores por 100g/100ml por defecto
    return {
      foodName: p.product_name || p.generic_name || "Producto desconocido",
      calories: Math.round(nut["energy-kcal_100g"] || 0),
      macros: {
        protein: Math.round((nut.proteins_100g || 0) * 10) / 10,
        carbs: Math.round((nut.carbohydrates_100g || 0) * 10) / 10,
        fat: Math.round((nut.fat_100g || 0) * 10) / 10,
      },
    };
  } catch (e) {
    logger.error("getProductByBarcode error", e);
    return null;
  }
}
