import type { Meal } from "@/types/meal";

export type MealExportFilter = "day" | "week" | "month" | "all";

/** Dispara la descarga de un Blob de forma robusta entre navegadores. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // Firefox y Safari móvil requieren el anchor en el DOM para disparar la descarga.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Liberamos en el siguiente tick para no cancelar la descarga en curso.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function mealToRecord(m: Meal) {
  return {
    id: m.id,
    foodName: m.foodName,
    calories: m.calories,
    macros: m.macros,
    recommendations: m.recommendations,
    imageUrl: m.imageUrl,
    createdAt: m.createdAt.toISOString(),
  };
}

/** Exporta las comidas a un archivo JSON descargable. */
export function exportMealsJson(meals: Meal[], filter: MealExportFilter): void {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          filter,
          meals: meals.map(mealToRecord),
        },
        null,
        2
      ),
    ],
    { type: "application/json;charset=utf-8" }
  );
  downloadBlob(blob, `eaty-historial-${filter}-${dateStamp()}.json`);
}

/** Escapa un valor para una celda CSV (comillas, comas, saltos de línea). */
function csvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Exporta las comidas a un archivo CSV descargable. */
export function exportMealsCsv(meals: Meal[], filter: MealExportFilter): void {
  const headers = [
    "fecha",
    "comida",
    "calorias",
    "proteina_g",
    "carbohidratos_g",
    "grasa_g",
    "fibra_g",
    "azucar_g",
    "recomendaciones",
  ];

  const rows = meals.map((m) =>
    [
      m.createdAt.toISOString(),
      m.foodName,
      m.calories,
      m.macros.protein,
      m.macros.carbs,
      m.macros.fat,
      m.macros.fiber,
      m.macros.sugar,
      m.recommendations.join(" | "),
    ]
      .map(csvCell)
      .join(",")
  );

  // BOM para que Excel detecte UTF-8 (acentos correctos).
  const csv = "﻿" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `eaty-historial-${filter}-${dateStamp()}.csv`);
}
