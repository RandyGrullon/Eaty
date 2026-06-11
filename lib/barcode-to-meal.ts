import type { BarcodeProduct } from "@/lib/barcode";

export interface BarcodeMealData {
  foodName: string;
  calories: number;
  macros: { protein: number; carbs: number; fat: number; fiber: number; sugar: number };
  imageUrl: string | null;
  recommendations: string[];
}

/**
 * Convierte un producto de código de barras (Open Food Facts) en los datos de
 * comida que consume la pantalla de análisis. Prefiere los valores por ración
 * (más realistas que "por 100 g") y añade recomendaciones según Nutri-Score/NOVA.
 */
export function barcodeProductToMealData(product: BarcodeProduct): BarcodeMealData {
  const useServing = Boolean(product.perServing && product.servingSizeGrams);
  const source = useServing ? product.perServing! : product;

  const macros = {
    protein: source.macros.protein,
    carbs: source.macros.carbs,
    fat: source.macros.fat,
    fiber: source.macros.fiber ?? 0,
    sugar: source.macros.sugar ?? 0,
  };

  const recommendations: string[] = [];
  recommendations.push(
    useServing
      ? `Valores calculados para 1 ración (${product.servingSizeGrams} g).`
      : "Valores nutricionales por 100 g del envase."
  );
  if (product.nutriScore) {
    recommendations.push(`Nutri-Score del producto: ${product.nutriScore.toUpperCase()}.`);
  }
  if (product.novaGroup) {
    recommendations.push(
      product.novaGroup >= 4
        ? "Producto ultra-procesado (NOVA 4): modera su consumo."
        : product.novaGroup === 3
        ? "Alimento procesado (NOVA 3): consumo ocasional."
        : "Alimento poco procesado."
    );
  }

  return {
    foodName: product.brand ? `${product.foodName} (${product.brand})` : product.foodName,
    calories: source.calories,
    macros,
    imageUrl: product.imageUrl ?? null,
    recommendations,
  };
}
