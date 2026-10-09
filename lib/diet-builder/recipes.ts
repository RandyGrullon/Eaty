/**
 * Construye la receta (nombre, ingredientes con gramos y medida casera, pasos,
 * sazón permitido y trucos contra calorías ocultas) a partir de los alimentos
 * elegidos por el motor y sus gramos. Determinista: no depende de la IA.
 */
import { nutritionFor, roundNutrition, sumNutrition } from "./solver";
import type { AllowedIngredient, CookingMethod, MealSlot, Recipe, RecipeIngredient, RecipeStep } from "./types";

export type Component = { ingredient: AllowedIngredient; grams: number };

const METHOD_SUFFIX: Record<CookingMethod, string> = {
  plancha: "a la plancha",
  sarten: "a la sartén",
  horno: "al horno",
  hervido: "",
  vapor: "al vapor",
  salteado: "salteado",
  crudo: "",
};

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const COUNTABLE = /^(huevo|clara|rebanada|lonja|papa|batata|plátano|pimiento|tomate|calabacín|espárrago|aguacate)/;

function pluralWord(w: string): string {
  if (/[aeiouáéó]$/.test(w)) return `${w}s`;
  if (/z$/.test(w)) return `${w.slice(0, -1)}ces`;
  if (/ón$/.test(w)) return `${w.slice(0, -2)}ones`;
  if (/ín$/.test(w)) return `${w.slice(0, -2)}ines`;
  return `${w}es`;
}

function formatQty(q: number): string {
  const whole = Math.floor(q);
  const frac = Math.round((q - whole) * 4) / 4;
  const fracLabel = frac === 0.25 ? "1/4" : frac === 0.5 ? "1/2" : frac === 0.75 ? "3/4" : "";
  if (whole === 0) return fracLabel || "0";
  return fracLabel ? `${whole} ${fracLabel}` : `${whole}`;
}

/** Medida casera aproximada: "≈ 3 huevos grandes", "≈ 1 1/2 cda". */
export function householdLabel(ing: AllowedIngredient, grams: number): string | undefined {
  if (!ing.household || grams <= 0) return undefined;
  const [first, ...rest] = ing.household.label.split(" ");
  let baseQty = 1;
  let unit = ing.household.label;
  if (/^\d+\/\d+$/.test(first)) {
    const [n, d] = first.split("/").map(Number);
    baseQty = n / d;
    unit = rest.join(" ");
  } else if (/^\d+$/.test(first)) {
    baseQty = Number(first);
    unit = rest.join(" ");
  }
  const raw = (grams / ing.household.grams) * baseQty;
  const countable = COUNTABLE.test(unit);
  const qty = countable && !/aguacate/.test(unit) ? Math.max(1, Math.round(raw)) : Math.round(raw * 4) / 4;
  if (qty <= 0) return undefined;
  const words = unit.split(" ");
  // Abreviaturas (cda, cdta) no llevan plural.
  if (qty > 1 && !/^(cda|cdta|g|ml)$/.test(words[0])) {
    words[0] = pluralWord(words[0]);
    if (words[1] && /^(grande|mediano|mediana|crudo|cruda)$/.test(words[1])) words[1] = pluralWord(words[1]);
  }
  return `≈ ${formatQty(qty)} ${words.join(" ")}`;
}

function sideName(c: Component): string {
  const suffix = METHOD_SUFFIX[c.ingredient.cooking.method];
  const name = lower(c.ingredient.name.replace(/\s*\(.*\)$/, ""));
  return suffix && c.ingredient.category === "vegetable" ? `${name} ${suffix}` : name;
}

function joinEs(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

export function recipeName(protein: Component, sides: Component[]): string {
  const main = protein.ingredient.dishName ?? `${protein.ingredient.name} ${METHOD_SUFFIX[protein.ingredient.cooking.method]}`.trim();
  const visibleSides = sides.filter((s) => s.grams > 0 && s.ingredient.category !== "fat");
  if (visibleSides.length === 0) return main;
  return `${main} con ${joinEs(visibleSides.map(sideName))}`;
}

function seasoningFor(protein: AllowedIngredient): string[] {
  const id = protein.id;
  if (/salmon|tilapia|tuna|shrimp/.test(id)) return ["Sal", "Pimienta negra", "Limón", "Ajo en polvo", "Eneldo o perejil"];
  if (/egg/.test(id)) return ["Sal", "Pimienta negra", "Cebollino", "Pimentón dulce"];
  if (/yogurt|cottage/.test(id)) return ["Canela", "Vainilla sin azúcar", "Ralladura de limón"];
  return ["Sal", "Pimienta negra", "Ajo en polvo", "Pimentón ahumado", "Comino", "Orégano"];
}

function equipmentFor(components: Component[]): string[] {
  const set = new Set<string>(["Báscula de cocina"]);
  for (const { ingredient: i, grams } of components) {
    if (grams <= 0) continue;
    const m = i.cooking.method;
    if (m === "plancha" || m === "sarten" || m === "salteado") set.add("Sartén antiadherente");
    if (m === "horno") set.add("Bandeja de horno");
    if (m === "hervido") set.add("Olla");
    if (m === "vapor") set.add("Vaporera u olla con tapa");
    if (i.cooking.doneness && i.category === "protein") set.add("Termómetro de cocina (opcional)");
  }
  return [...set];
}

export function buildRecipe(id: string, slot: MealSlot, components: Component[]): Recipe {
  const used = components.filter((c) => c.grams > 0);
  const protein = used.find((c) => c.ingredient.category === "protein") ?? used[0];
  const extraProteins = used.filter((c) => c.ingredient.category === "protein" && c !== protein);
  const carbs = used.filter((c) => c.ingredient.category === "carb");
  const vegs = used.filter((c) => c.ingredient.category === "vegetable");
  const fats = used.filter((c) => c.ingredient.category === "fat");
  const cookingFats = fats.filter((f) => f.ingredient.cooking.method !== "crudo");
  const toppingFats = fats.filter((f) => f.ingredient.cooking.method === "crudo");

  const ingredients: RecipeIngredient[] = used.map(({ ingredient, grams }) => ({
    ingredientId: ingredient.id,
    name: ingredient.name,
    grams,
    household: householdLabel(ingredient, grams),
    nutrition: roundNutrition(nutritionFor(ingredient, grams)),
  }));
  const nutrition = roundNutrition(sumNutrition(used.map((c) => nutritionFor(c.ingredient, c.grams))));

  const steps: RecipeStep[] = [];
  const seasoning = seasoningFor(protein.ingredient);
  const weighList = joinEs(used.map((c) => `${c.grams} g de ${lower(c.ingredient.name)}`));

  steps.push({
    n: 0,
    title: "Pesa y prepara los ingredientes",
    detail: `Pesa en crudo ${weighList}.${protein.ingredient.cooking.prep ? ` ${protein.ingredient.cooking.prep}` : ""}${
      vegs.length ? ` Lava y corta ${joinEs(vegs.map((v) => lower(v.ingredient.name)))} en trozos parejos.` : ""
    }`,
    minutes: 5,
    tip: "Pesa siempre en crudo: el peso cocido cambia con el agua y descuadra el conteo.",
  });

  for (const c of carbs) {
    const ck = c.ingredient.cooking;
    if (ck.method === "crudo") continue;
    steps.push({
      n: 0,
      title: `Cocina ${lower(c.ingredient.name.replace(/\s*\(.*\)$/, ""))}`,
      detail: `${ck.prep ? `${ck.prep} ` : ""}Cocina a ${ck.heat} durante ~${ck.minutes} min${ck.method === "hervido" ? " y escurre si sobra agua" : ""}. Mientras tanto, sigue con el resto del plato.`,
      minutes: ck.minutes,
      tempC: ck.tempC,
    });
  }

  const pc = protein.ingredient.cooking;
  const fatLine = cookingFats.length
    ? ` Añade ${joinEs(cookingFats.map((f) => `${f.grams} g de ${lower(f.ingredient.name)}${householdLabel(f.ingredient, f.grams) ? ` (${householdLabel(f.ingredient, f.grams)})` : ""}`))} medidos y deja que se caliente.`
    : protein.ingredient.per100g.fat >= 10
      ? " No añadas aceite: la propia grasa del alimento basta."
      : " Usa una sartén antiadherente para no necesitar grasa extra.";
  if (pc.method === "crudo") {
    steps.push({
      n: 0,
      title: `Prepara ${lower(protein.ingredient.name)}`,
      detail: `${pc.prep ?? "Sírvelo en un bol."} Sazona con ${joinEs(seasoning.slice(0, 3).map(lower))}.`,
      minutes: 2,
    });
  } else {
    steps.push({
      n: 0,
      title: `Cocina ${lower(protein.ingredient.name)} ${METHOD_SUFFIX[pc.method]}`.trim(),
      detail: `Calienta la ${pc.method === "horno" ? "bandeja en el horno" : "sartén"} a ${pc.heat}.${pc.method === "horno" ? "" : fatLine} Sazona con ${joinEs(seasoning.slice(0, 3).map(lower))} y cocina ~${pc.minutes} min, volteando a mitad de tiempo.${pc.doneness ? ` ${pc.doneness}` : ""}`,
      minutes: pc.minutes,
      tempC: pc.tempC,
      tip: pc.doneness ? "Un termómetro evita pasarte de cocción y que quede seco." : undefined,
    });
  }

  for (const extra of extraProteins) {
    const ec = extra.ingredient.cooking;
    const qty = householdLabel(extra.ingredient, extra.grams);
    steps.push({
      n: 0,
      title:
        ec.method === "crudo"
          ? `Prepara ${lower(extra.ingredient.name)}`
          : `Cocina ${lower(extra.ingredient.name)}${ec.method === "sarten" && /egg/.test(extra.ingredient.id) ? " revueltos" : ""}`,
      detail:
        ec.method === "crudo"
          ? `${ec.prep ?? `Sirve ${extra.grams} g de ${lower(extra.ingredient.name)}.`}`
          : `${ec.prep ? `${ec.prep} ` : ""}En la misma sartén, a ${ec.heat}, cocina ${extra.grams} g${qty ? ` (${qty})` : ""} durante ~${ec.minutes} min.${ec.doneness ? ` ${ec.doneness}` : ""}`,
      minutes: ec.minutes || undefined,
    });
  }

  for (const v of vegs) {
    const vc = v.ingredient.cooking;
    steps.push({
      n: 0,
      title: vc.method === "crudo" ? `Prepara ${lower(v.ingredient.name)}` : `Cocina ${lower(v.ingredient.name)} ${METHOD_SUFFIX[vc.method]}`.trim(),
      detail:
        vc.method === "crudo"
          ? `Lava, seca y corta ${lower(v.ingredient.name)}. Aliña solo con limón, vinagre y sal.`
          : `Cocina a ${vc.heat} durante ~${vc.minutes} min hasta que esté tierno pero firme y de color intenso. Sin aceite extra: un chorrito de agua evita que se pegue.`,
      minutes: vc.minutes || undefined,
      tempC: vc.tempC,
    });
  }

  steps.push({
    n: 0,
    title: "Sazona y emplata",
    detail: `Ajusta el punto de sal y especias (${joinEs(seasoning.map(lower))}: aportan sabor sin calorías).${
      toppingFats.length ? ` Añade al final ${joinEs(toppingFats.map((f) => `${f.grams} g de ${lower(f.ingredient.name)}`))}.` : ""
    } Sirve de inmediato.`,
    minutes: 2,
  });

  steps.forEach((s, i) => (s.n = i + 1));

  const hiddenCalorieTips = [
    "Mide cualquier grasa con cuchara: 1 cda de aceite son ~120 kcal y 1 de mantequilla ~100 kcal.",
    "Nada de salsas comerciales (mayonesa, kétchup, aderezos): usa limón, vinagre, mostaza o especias.",
    "Si pruebas mientras cocinas, cuenta esos bocados.",
  ];
  if (protein.ingredient.per100g.fat >= 10) {
    hiddenCalorieTips.push("La grasa que sueltes y escurras no se descuenta: el conteo queda del lado seguro.");
  }
  if (carbs.length) {
    hiddenCalorieTips.push("Pesa el carbohidrato en crudo; servirlo \"a ojo\" ya cocido suele sumar 50–100 kcal.");
  }

  const prepMinutes = 5 + (vegs.length ? 3 : 0);
  const proteinMinutes = pc.minutes;
  const vegMinutes = vegs.reduce((s, v) => s + v.ingredient.cooking.minutes, 0);
  const carbMinutes = carbs.reduce((s, c) => Math.max(s, c.ingredient.cooking.minutes), 0);
  const cookMinutes = Math.max(carbMinutes, proteinMinutes + vegMinutes);

  return {
    id,
    name: recipeName(protein, used.filter((c) => c !== protein)),
    slot,
    ingredients,
    nutrition,
    prepMinutes,
    cookMinutes,
    equipment: equipmentFor(used),
    seasoning,
    steps,
    hiddenCalorieTips,
    plating: vegs.length
      ? `Sirve ${lower(protein.ingredient.name)} junto a ${joinEs(vegs.map((v) => lower(v.ingredient.name)))}${carbs.length ? ` y ${joinEs(carbs.map((c) => lower(c.ingredient.name)))}` : ""}.`
      : `Sirve ${lower(protein.ingredient.name)} recién hecho.`,
  };
}
