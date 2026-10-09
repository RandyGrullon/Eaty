/**
 * Catálogo de alimentos base. Valores por 100 g en crudo (salvo que se indique),
 * aproximados a partir de USDA FoodData Central. Carbohidratos = netos.
 */
import type { AllowedIngredient, CookingProfile, IngredientCategory, MealSlot } from "./types";

type Def = {
  id: string;
  name: string;
  category: IngredientCategory;
  /** kcal, proteína, grasa, carbohidratos netos, fibra */
  n: [number, number, number, number, number?];
  household?: [string, number];
  portion: [number, number, number];
  slots: MealSlot[];
  cooking: CookingProfile;
  dishName?: string;
};

const PLANCHA = (minutes: number, doneness?: string, prep?: string): CookingProfile => ({
  method: "plancha",
  heat: "fuego medio-alto",
  minutes,
  doneness,
  prep,
});
const HORNO = (tempC: number, minutes: number, doneness?: string, prep?: string): CookingProfile => ({
  method: "horno",
  heat: `horno a ${tempC} °C`,
  tempC,
  minutes,
  doneness,
  prep,
});
const HERVIDO = (minutes: number, prep?: string): CookingProfile => ({
  method: "hervido",
  heat: "fuego alto hasta hervir, luego medio",
  minutes,
  prep,
});
const VAPOR = (minutes: number): CookingProfile => ({ method: "vapor", heat: "vapor a fuego medio", minutes });
const SALTEADO = (minutes: number): CookingProfile => ({ method: "salteado", heat: "fuego medio-alto", minutes });
const CRUDO: CookingProfile = { method: "crudo", heat: "sin cocción", minutes: 0 };

const DEFS: Def[] = [
  // ── Proteínas ──
  { id: "beef-ground-85", name: "Res molida 85/15", category: "protein", n: [215, 18.6, 15, 0], portion: [80, 400, 10], slots: ["main"],
    cooking: { method: "sarten", heat: "fuego medio-alto", minutes: 9, doneness: "Hasta 71 °C internos, sin partes rosadas.", prep: "Desmenuza la carne en la sartén caliente sin aceite: suelta su propia grasa." },
    dishName: "Res molida salteada" },
  { id: "beef-ground-90", name: "Res molida 90/10", category: "protein", n: [176, 20, 10, 0], portion: [80, 400, 10], slots: ["main"],
    cooking: { method: "sarten", heat: "fuego medio-alto", minutes: 8, doneness: "Hasta 71 °C internos.", prep: "Desmenuza la carne en la sartén caliente." },
    dishName: "Res molida salteada" },
  { id: "beef-flank", name: "Vacío de res", category: "protein", n: [155, 21.2, 7.2, 0], portion: [100, 400, 10], slots: ["main"],
    cooking: PLANCHA(10, "4–5 min por lado para término medio (57 °C); reposa 5 min antes de cortar en contra de la fibra.", "Sácalo de la nevera 20 min antes y sécalo con papel."),
    dishName: "Vacío de res a la plancha" },
  { id: "chicken-breast", name: "Pechuga de pollo", category: "protein", n: [120, 22.5, 2.6, 0], portion: [100, 400, 10], slots: ["main"],
    cooking: PLANCHA(12, "Hasta 74 °C internos; el jugo debe salir transparente.", "Aplánala a un grosor parejo de 2 cm para que se cocine uniforme."),
    dishName: "Pollo a la plancha" },
  { id: "chicken-thigh", name: "Muslo de pollo sin piel", category: "protein", n: [121, 19.7, 4.1, 0], portion: [100, 400, 10], slots: ["main"],
    cooking: HORNO(200, 25, "Hasta 74–80 °C internos.", "Retira la piel y la grasa visible."), dishName: "Muslos de pollo al horno" },
  { id: "turkey-ground", name: "Pavo molido 93/7", category: "protein", n: [150, 18.7, 8.3, 0], portion: [100, 400, 10], slots: ["main"],
    cooking: { method: "sarten", heat: "fuego medio", minutes: 9, doneness: "Hasta 74 °C internos." }, dishName: "Pavo salteado" },
  { id: "salmon", name: "Salmón", category: "protein", n: [208, 20.4, 13.4, 0], portion: [100, 400, 10], slots: ["main"],
    cooking: PLANCHA(8, "Hasta 52–63 °C internos; se separa en láminas.", "Empieza por el lado de la piel, sin moverlo, para que no se pegue."),
    dishName: "Salmón a la plancha" },
  { id: "tuna-water", name: "Atún en agua (escurrido)", category: "protein", n: [116, 25.5, 0.8, 0], portion: [60, 250, 10], slots: ["main", "snack"],
    cooking: { ...CRUDO, prep: "Escúrrelo bien y desmenúzalo con un tenedor." }, dishName: "Atún" },
  { id: "tilapia", name: "Tilapia", category: "protein", n: [96, 20.1, 1.7, 0], portion: [120, 400, 10], slots: ["main"],
    cooking: PLANCHA(7, "Hasta 63 °C; la carne queda opaca y se desmenuza."), dishName: "Tilapia a la plancha" },
  { id: "shrimp", name: "Camarones", category: "protein", n: [85, 20.1, 0.5, 0], portion: [100, 400, 10], slots: ["main"],
    cooking: SALTEADO(4), dishName: "Camarones salteados" },
  { id: "pork-tenderloin", name: "Lomo de cerdo", category: "protein", n: [120, 21, 3.5, 0], portion: [100, 400, 10], slots: ["main"],
    cooking: HORNO(210, 22, "Hasta 63 °C internos y reposo de 3 min."), dishName: "Lomo de cerdo al horno" },
  { id: "eggs", name: "Huevos", category: "protein", n: [143, 12.6, 9.5, 0.7], household: ["1 huevo grande", 50], portion: [50, 300, 50], slots: ["breakfast", "main", "snack"],
    cooking: { method: "sarten", heat: "fuego medio-bajo", minutes: 4, doneness: "Clara cuajada; yema al gusto.", prep: "Bátelos con una pizca de sal justo antes de cocinar." },
    dishName: "Huevos revueltos" },
  { id: "egg-whites", name: "Claras de huevo", category: "protein", n: [52, 10.9, 0.2, 0.7], household: ["1 clara", 33], portion: [66, 330, 33], slots: ["breakfast", "main"],
    cooking: { method: "sarten", heat: "fuego medio", minutes: 3 }, dishName: "Claras revueltas" },
  { id: "greek-yogurt", name: "Yogur griego 0%", category: "protein", n: [59, 10.3, 0.4, 3.6], household: ["1 taza", 245], portion: [100, 350, 10], slots: ["breakfast", "snack"],
    cooking: CRUDO, dishName: "Bowl de yogur griego" },
  { id: "cottage", name: "Queso cottage", category: "protein", n: [98, 11.1, 4.3, 3.4], household: ["1/2 taza", 113], portion: [100, 300, 10], slots: ["breakfast", "snack"],
    cooking: CRUDO, dishName: "Cottage" },
  { id: "tofu", name: "Tofu firme", category: "protein", n: [144, 17.3, 8.7, 0.5, 2.3], portion: [100, 400, 10], slots: ["main"],
    cooking: { method: "sarten", heat: "fuego medio-alto", minutes: 8, prep: "Presiónalo 10 min entre papel para quitar el agua y córtalo en cubos." },
    dishName: "Tofu dorado" },

  // ── Grasas ──
  { id: "butter", name: "Mantequilla", category: "fat", n: [717, 0.9, 81, 0.1], household: ["1 cda", 14], portion: [0, 40, 5], slots: ["breakfast", "main"],
    cooking: { method: "sarten", heat: "fuego medio", minutes: 1, prep: "Mídela con cuchara; úsala para cocinar o derretida al final." } },
  { id: "olive-oil", name: "Aceite de oliva", category: "fat", n: [884, 0, 100, 0], household: ["1 cda", 13.5], portion: [0, 30, 5], slots: ["breakfast", "main"],
    cooking: { method: "sarten", heat: "fuego medio", minutes: 1, prep: "Mídelo con cuchara medidora, no a ojo." } },
  { id: "avocado", name: "Aguacate", category: "fat", n: [160, 2, 14.7, 1.8, 6.7], household: ["1/2 aguacate", 70], portion: [0, 200, 10], slots: ["breakfast", "main", "snack"],
    cooking: { ...CRUDO, prep: "Córtalo en láminas justo antes de servir." } },
  { id: "almonds", name: "Almendras", category: "fat", n: [579, 21.2, 49.9, 9.1, 12.5], household: ["1 puñado", 28], portion: [0, 60, 5], slots: ["breakfast", "snack"], cooking: CRUDO },
  { id: "walnuts", name: "Nueces", category: "fat", n: [654, 15.2, 65.2, 7, 6.7], household: ["1 puñado", 28], portion: [0, 50, 5], slots: ["breakfast", "snack"], cooking: CRUDO },
  { id: "cheddar", name: "Queso cheddar", category: "fat", n: [403, 24.9, 33.1, 1.3], household: ["1 lonja", 21], portion: [0, 80, 5], slots: ["breakfast", "main", "snack"], cooking: CRUDO },
  { id: "peanut-butter", name: "Crema de cacahuete", category: "fat", n: [588, 25, 50, 14, 6], household: ["1 cda", 16], portion: [0, 40, 5], slots: ["breakfast", "snack"], cooking: CRUDO },

  // ── Carbohidratos (peso en crudo / seco) ──
  { id: "white-rice", name: "Arroz blanco", category: "carb", n: [365, 7.1, 0.7, 78.7, 1.3], household: ["1/2 taza en crudo", 92], portion: [0, 150, 5], slots: ["main"],
    cooking: HERVIDO(18, "Lávalo hasta que el agua salga clara; 2 partes de agua por 1 de arroz.") },
  { id: "brown-rice", name: "Arroz integral", category: "carb", n: [370, 7.9, 2.9, 74, 3.5], household: ["1/2 taza en crudo", 95], portion: [0, 150, 5], slots: ["main"],
    cooking: HERVIDO(40, "2,5 partes de agua por 1 de arroz.") },
  { id: "oats", name: "Avena en hojuelas", category: "carb", n: [389, 16.9, 6.9, 55.7, 10.6], household: ["1/2 taza", 40], portion: [0, 120, 5], slots: ["breakfast", "snack"],
    cooking: HERVIDO(5, "Cuécela con agua o leche descremada medida.") },
  { id: "potato", name: "Papa", category: "carb", n: [77, 2, 0.1, 15.3, 2.2], household: ["1 papa mediana", 170], portion: [0, 500, 10], slots: ["main"],
    cooking: HORNO(220, 30, undefined, "Córtala en gajos con piel.") },
  { id: "sweet-potato", name: "Batata / boniato", category: "carb", n: [86, 1.6, 0.1, 17.1, 3], household: ["1 batata mediana", 130], portion: [0, 450, 10], slots: ["main"],
    cooking: HORNO(220, 30, undefined, "Córtala en cubos de 2 cm.") },
  { id: "quinoa", name: "Quinoa", category: "carb", n: [368, 14.1, 6.1, 57.2, 7], household: ["1/4 taza en crudo", 43], portion: [0, 130, 5], slots: ["main"],
    cooking: HERVIDO(15, "Enjuágala para quitar el amargor; 2 partes de agua por 1.") },
  { id: "pasta", name: "Pasta seca", category: "carb", n: [371, 13, 1.5, 71.8, 3.2], household: ["1 taza en seco", 100], portion: [0, 140, 5], slots: ["main"],
    cooking: HERVIDO(10, "Agua con sal abundante; al dente.") },
  { id: "whole-bread", name: "Pan integral", category: "carb", n: [247, 13, 3.4, 34, 7], household: ["1 rebanada", 30], portion: [0, 120, 30], slots: ["breakfast"],
    cooking: { method: "plancha", heat: "tostadora o sartén seca", minutes: 3 } },
  { id: "banana", name: "Plátano / banana", category: "carb", n: [89, 1.1, 0.3, 20.2, 2.6], household: ["1 plátano mediano", 118], portion: [0, 240, 10], slots: ["breakfast", "snack"], cooking: CRUDO },
  { id: "black-beans", name: "Frijoles negros (cocidos)", category: "carb", n: [132, 8.9, 0.5, 15, 8.7], household: ["1/2 taza", 86], portion: [0, 300, 10], slots: ["main"],
    cooking: { method: "hervido", heat: "fuego medio", minutes: 5, prep: "Si son de lata, enjuágalos bien." } },
  { id: "lentils", name: "Lentejas (cocidas)", category: "carb", n: [116, 9, 0.4, 12.1, 7.9], household: ["1/2 taza", 99], portion: [0, 300, 10], slots: ["main"],
    cooking: { method: "hervido", heat: "fuego medio", minutes: 5 } },

  // ── Verduras ──
  { id: "broccoli", name: "Brócoli", category: "vegetable", n: [34, 2.8, 0.4, 4, 2.6], household: ["1 taza", 91], portion: [80, 300, 10], slots: ["main"], cooking: VAPOR(5) },
  { id: "spinach", name: "Espinaca", category: "vegetable", n: [23, 2.9, 0.4, 1.4, 2.2], household: ["1 taza cruda", 30], portion: [30, 200, 10], slots: ["breakfast", "main"], cooking: SALTEADO(2) },
  { id: "zucchini", name: "Calabacín", category: "vegetable", n: [17, 1.2, 0.3, 2.1, 1], household: ["1 calabacín mediano", 200], portion: [80, 300, 10], slots: ["main"], cooking: SALTEADO(5) },
  { id: "asparagus", name: "Espárragos", category: "vegetable", n: [20, 2.2, 0.1, 1.8, 2.1], household: ["6 espárragos", 90], portion: [80, 250, 10], slots: ["main"], cooking: PLANCHA(6) },
  { id: "cauliflower", name: "Coliflor", category: "vegetable", n: [25, 1.9, 0.3, 3, 2], household: ["1 taza", 107], portion: [80, 300, 10], slots: ["main"], cooking: HORNO(220, 20) },
  { id: "bell-pepper", name: "Pimiento", category: "vegetable", n: [31, 1, 0.3, 3.9, 2.1], household: ["1 pimiento", 120], portion: [50, 200, 10], slots: ["breakfast", "main"], cooking: SALTEADO(5) },
  { id: "green-salad", name: "Ensalada verde", category: "vegetable", n: [15, 1.4, 0.2, 1.6, 1.3], household: ["2 tazas", 72], portion: [50, 200, 10], slots: ["main"], cooking: CRUDO },
  { id: "mushrooms", name: "Champiñones", category: "vegetable", n: [22, 3.1, 0.3, 2.3, 1], household: ["1 taza", 70], portion: [50, 250, 10], slots: ["breakfast", "main"], cooking: SALTEADO(6) },
  { id: "tomato", name: "Tomate", category: "vegetable", n: [18, 0.9, 0.2, 2.7, 1.2], household: ["1 tomate mediano", 123], portion: [50, 250, 10], slots: ["breakfast", "main"], cooking: CRUDO },
  { id: "green-beans", name: "Judías verdes", category: "vegetable", n: [31, 1.8, 0.2, 4.3, 2.7], household: ["1 taza", 100], portion: [80, 250, 10], slots: ["main"], cooking: VAPOR(7) },
];

export const INGREDIENT_CATALOG: AllowedIngredient[] = DEFS.map((d) => ({
  id: d.id,
  name: d.name,
  category: d.category,
  per100g: { kcal: d.n[0], protein: d.n[1], fat: d.n[2], netCarbs: d.n[3], fiber: d.n[4] ?? 0 },
  household: d.household ? { label: d.household[0], grams: d.household[1] } : undefined,
  portion: { min: d.portion[0], max: d.portion[1], step: d.portion[2] },
  slots: d.slots,
  cooking: d.cooking,
  dishName: d.dishName,
}));

export function getCatalogIngredient(id: string): AllowedIngredient | undefined {
  return INGREDIENT_CATALOG.find((i) => i.id === id);
}

/** Alimentos del ejemplo del brief: res, vacío, salmón, brócoli, huevos y mantequilla. */
export const EXAMPLE_INGREDIENT_IDS = [
  "beef-ground-85",
  "beef-flank",
  "salmon",
  "broccoli",
  "eggs",
  "butter",
];

/** Crea un ingrediente propio a partir de sus macros por 100 g. */
export function makeCustomIngredient(input: {
  name: string;
  category: AllowedIngredient["category"];
  kcal: number;
  protein: number;
  fat: number;
  netCarbs: number;
}): AllowedIngredient {
  const slug = input.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const isProtein = input.category === "protein";
  const isFat = input.category === "fat";
  return {
    id: `custom-${slug || "alimento"}`,
    name: input.name.trim(),
    category: input.category,
    per100g: { kcal: input.kcal, protein: input.protein, fat: input.fat, netCarbs: input.netCarbs, fiber: 0 },
    portion: isFat ? { min: 0, max: 60, step: 5 } : isProtein ? { min: 80, max: 350, step: 10 } : { min: 0, max: 300, step: 10 },
    slots: ["breakfast", "main", "snack"],
    cooking: isProtein ? PLANCHA(10, "Cocina hasta que esté hecho por dentro.") : input.category === "vegetable" ? SALTEADO(5) : CRUDO,
    dishName: input.name.trim(),
    custom: true,
  };
}
