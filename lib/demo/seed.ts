/**
 * Datos de ejemplo del modo demo: un perfil completo, ~2 semanas de comidas,
 * una dieta activa y la hidratación del día.
 */
import { buildDishImageUrl, buildDishPrompt } from "@/lib/dish-image";

const UID = "demo-user";

/**
 * Imágenes generadas por IA (mismo generador que usa la app, vía /api/dish-image).
 * Nada de fotos de stock: cada plato se genera a partir de su descripción.
 */
function aiImage(description: string): string {
  let h = 0;
  for (let i = 0; i < description.length; i++) h = (h * 31 + description.charCodeAt(i)) | 0;
  return buildDishImageUrl(buildDishPrompt({ foodName: description }), Math.abs(h) % 1_000_000);
}

const IMAGES = {
  chickenBowl: aiImage("grilled chicken rice bowl with corn, cherry tomatoes and red cabbage"),
  buddhaBowl: aiImage("vegan buddha bowl with chickpeas, avocado, roasted sweet potato and radish"),
  eggBowl: aiImage("quinoa bowl with soft boiled egg, cucumber, tomato and spinach"),
  steakSalad: aiImage("thai beef salad with greens, red onion and peanuts"),
  pizza: aiImage("two slices of margherita pizza with fresh basil"),
  eggToast: aiImage("sourdough toast with fried egg and sliced avocado"),
  salmon: aiImage("baked salmon fillet with zucchini and peppers"),
  spinachSalad: aiImage("spinach salad with pomegranate seeds and avocado"),
  frenchToast: aiImage("french toast with banana slices and blueberries"),
  quinoaPlate: aiImage("quinoa with sauteed green beans and tomato"),
  skewers: aiImage("grilled chicken and pork skewers with roasted potatoes"),
  yogurt: aiImage("greek yogurt bowl with walnuts and honey"),
};

type MealSeed = {
  name: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  image: string | null;
  hour: number;
  minute?: number;
  recs: string[];
  description: string;
  components: string[];
};

const BREAKFASTS: MealSeed[] = [
  {
    name: "Tostada con huevo y aguacate",
    kcal: 380,
    p: 17,
    c: 32,
    f: 20,
    image: IMAGES.eggToast,
    hour: 8,
    recs: ["Buen equilibrio de grasas saludables", "Añade fruta para más fibra"],
    description: "Pan de masa madre tostado con huevo frito y aguacate.",
    components: ["pan de masa madre", "huevo", "aguacate"],
  },
  {
    name: "French toast con plátano y arándanos",
    kcal: 520,
    p: 14,
    c: 78,
    f: 16,
    image: IMAGES.frenchToast,
    hour: 9,
    recs: ["Alto en azúcares: compénsalo con proteína en el almuerzo"],
    description: "Torrijas con rodajas de plátano, arándanos y sirope.",
    components: ["pan brioche", "plátano", "arándanos", "sirope"],
  },
  {
    name: "Bowl de quinoa con huevo",
    kcal: 430,
    p: 21,
    c: 44,
    f: 18,
    image: IMAGES.eggBowl,
    hour: 8,
    minute: 30,
    recs: ["Excelente fuente de proteína completa"],
    description: "Quinoa, huevo cocido, pepino, tomate y espinacas.",
    components: ["quinoa", "huevo", "pepino", "tomate", "espinaca"],
  },
];

const LUNCHES: MealSeed[] = [
  {
    name: "Bowl de pollo a la plancha",
    kcal: 610,
    p: 46,
    c: 52,
    f: 22,
    image: IMAGES.chickenBowl,
    hour: 13,
    recs: ["Gran aporte de proteína magra", "Buena variedad de vegetales"],
    description: "Pollo a la plancha con maíz, tomate cherry, lombarda y arroz.",
    components: ["pollo", "arroz", "maíz", "tomate cherry", "lombarda"],
  },
  {
    name: "Buddha bowl vegetal",
    kcal: 540,
    p: 19,
    c: 62,
    f: 24,
    image: IMAGES.buddhaBowl,
    hour: 13,
    minute: 30,
    recs: ["Rico en fibra y micronutrientes", "Suma tofu o huevo para más proteína"],
    description: "Garbanzos, aguacate, boniato asado, rábano y brotes.",
    components: ["garbanzos", "aguacate", "boniato", "rábano", "lechuga"],
  },
  {
    name: "Ensalada de ternera thai",
    kcal: 480,
    p: 34,
    c: 28,
    f: 24,
    image: IMAGES.steakSalad,
    hour: 14,
    recs: ["Controla la salsa: aporta sodio"],
    description: "Tiras de ternera con hojas verdes, cebolla morada y cacahuetes.",
    components: ["ternera", "hojas verdes", "cebolla morada", "cacahuetes"],
  },
  {
    name: "Quinoa con judías verdes",
    kcal: 420,
    p: 16,
    c: 58,
    f: 12,
    image: IMAGES.quinoaPlate,
    hour: 13,
    recs: ["Plato ligero y saciante"],
    description: "Quinoa con judías verdes salteadas y tomate.",
    components: ["quinoa", "judías verdes", "tomate"],
  },
];

const DINNERS: MealSeed[] = [
  {
    name: "Salmón con verduras",
    kcal: 560,
    p: 38,
    c: 22,
    f: 34,
    image: IMAGES.salmon,
    hour: 20,
    recs: ["Omega-3 de calidad", "Porción de grasa algo alta para la cena"],
    description: "Lomo de salmón al horno con calabacín y caldo de verduras.",
    components: ["salmón", "calabacín", "pimiento", "caldo"],
  },
  {
    name: "Pizza margarita (2 porciones)",
    kcal: 640,
    p: 26,
    c: 74,
    f: 26,
    image: IMAGES.pizza,
    hour: 21,
    recs: ["Comida libre: equilibra con verduras mañana"],
    description: "Dos porciones de pizza con mozzarella y albahaca.",
    components: ["masa", "mozzarella", "tomate", "albahaca"],
  },
  {
    name: "Brochetas mixtas a la parrilla",
    kcal: 690,
    p: 52,
    c: 30,
    f: 38,
    image: IMAGES.skewers,
    hour: 20,
    minute: 30,
    recs: ["Muy alto en proteína", "Acompaña con ensalada en vez de papas"],
    description: "Brochetas de pollo y cerdo con papas asadas y salsas.",
    components: ["pollo", "cerdo", "papas", "pimiento"],
  },
];

const SNACKS: MealSeed[] = [
  {
    name: "Ensalada de espinacas y granada",
    kcal: 260,
    p: 8,
    c: 24,
    f: 15,
    image: IMAGES.spinachSalad,
    hour: 17,
    recs: ["Antioxidantes y hierro vegetal"],
    description: "Espinacas, granada, aguacate y salmón ahumado.",
    components: ["espinacas", "granada", "aguacate"],
  },
  {
    name: "Yogur griego con nueces",
    kcal: 210,
    p: 15,
    c: 12,
    f: 11,
    image: IMAGES.yogurt,
    hour: 17,
    minute: 30,
    recs: ["Snack alto en proteína"],
    description: "Yogur griego natural con nueces y miel.",
    components: ["yogur griego", "nueces", "miel"],
  },
];

function at(daysAgo: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function seedDemoData(ts: (ms: number) => unknown): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  const now = new Date();
  let n = 0;

  const addMeal = (m: MealSeed, date: Date, extra: Record<string, unknown> = {}) => {
    n += 1;
    out[`users/${UID}/meals/seed-${n}`] = {
      foodName: m.name,
      calories: m.kcal,
      macros: {
        protein: m.p,
        carbs: m.c,
        fat: m.f,
        fiber: Math.round(m.c * 0.12),
        sugar: Math.round(m.c * 0.18),
      },
      recommendations: m.recs,
      imageUrl: m.image,
      aiContext: {
        dishDescription: m.description,
        visibleComponents: m.components,
        confidence: "high",
        portionHypothesis: { relativeSize: "medium" },
      },
      isPlanned: false,
      createdAt: ts(date.getTime()),
      ...extra,
    };
  };

  // Hoy: desayuno + almuerzo (+ snack si ya es tarde).
  const hourNow = now.getHours();
  addMeal(BREAKFASTS[0], at(0, Math.min(8, Math.max(0, hourNow - 3))), { mood: "energetic" });
  if (hourNow >= 12) addMeal(LUNCHES[0], at(0, 13), { mood: "satisfied" });
  if (hourNow >= 17) addMeal(SNACKS[1], at(0, 17, 30));

  // Días anteriores (13 días; uno sin registros para que el ritmo sea realista).
  for (let d = 1; d <= 13; d++) {
    if (d === 5) continue;
    const b = BREAKFASTS[d % BREAKFASTS.length];
    const l = LUNCHES[d % LUNCHES.length];
    const dn = DINNERS[d % DINNERS.length];
    addMeal(b, at(d, b.hour, b.minute));
    addMeal(l, at(d, l.hour, l.minute), { mood: d % 3 === 0 ? "heavy" : "satisfied" });
    if (d % 2 === 0) {
      const s = SNACKS[d % SNACKS.length];
      addMeal(s, at(d, s.hour, s.minute));
    }
    addMeal(dn, at(d, dn.hour, dn.minute));
  }

  // Plan: cena de mañana.
  addMeal(DINNERS[0], at(-1, 20), { isPlanned: true });

  const birth = new Date(now.getFullYear() - 29, 4, 14);

  out[`users/${UID}/profile/main`] = {
    uid: UID,
    birthDate: localDayKey(birth),
    gender: "male",
    weight: 78,
    height: 178,
    weightUnit: "kg",
    heightUnit: "cm",
    activityLevel: "moderate",
    fitnessGoal: "shedding",
    currentStreak: 4,
    lastActiveDate: ts(now.getTime()),
    achievements: ["first_meal", "streak_3", "meals_10"],
    points: 340,
    level: 3,
    allergens: [],
    language: "es",
    activeDietId: "demo-diet",
    customGoals: { calories: 2100, protein: 150, carbs: 210, fat: 70 },
    trainingDaysPerWeek: 4,
    createdAt: ts(at(20, 10).getTime()),
    updatedAt: ts(now.getTime()),
  };

  out[`users/${UID}/dailyStats/${localDayKey(now)}`] = {
    waterGlasses: 5,
    updatedAt: ts(now.getTime()),
  };

  out[`users/${UID}/diets/demo-diet`] = {
    name: "Definición mediterránea",
    description:
      "Déficit moderado con proteína alta, grasas de oliva y pescado, y carbohidratos de grano entero.",
    goal: "shedding",
    tags: ["alta en proteína", "mediterránea", "sin ultraprocesados"],
    imageUrl: IMAGES.salmon,
    targetCalories: 2100,
    targetMacros: { protein: 150, carbs: 210, fat: 70 },
    dishes: [
      { id: "d1", name: "Bowl de quinoa con huevo", type: "breakfast", description: "Quinoa, huevo cocido y verduras frescas.", imageUrl: IMAGES.eggBowl, calories: 430, macros: { protein: 21, carbs: 44, fat: 18 } },
      { id: "d2", name: "Tostada con huevo y aguacate", type: "breakfast", description: "Masa madre, huevo y aguacate.", imageUrl: IMAGES.eggToast, calories: 380, macros: { protein: 17, carbs: 32, fat: 20 } },
      { id: "d3", name: "Bowl de pollo a la plancha", type: "lunch", description: "Pollo, arroz integral y vegetales.", imageUrl: IMAGES.chickenBowl, calories: 610, macros: { protein: 46, carbs: 52, fat: 22 } },
      { id: "d4", name: "Buddha bowl vegetal", type: "lunch", description: "Garbanzos, boniato y aguacate.", imageUrl: IMAGES.buddhaBowl, calories: 540, macros: { protein: 19, carbs: 62, fat: 24 } },
      { id: "d5", name: "Salmón con verduras", type: "dinner", description: "Salmón al horno con calabacín.", imageUrl: IMAGES.salmon, calories: 560, macros: { protein: 38, carbs: 22, fat: 34 } },
      { id: "d6", name: "Ensalada de espinacas y granada", type: "snack", description: "Espinacas, granada y nueces.", imageUrl: IMAGES.spinachSalad, calories: 260, macros: { protein: 8, carbs: 24, fat: 15 } },
    ],
    createdBy: "ai",
    status: "ready",
    createdAt: ts(at(10, 12).getTime()),
    updatedAt: ts(at(2, 12).getTime()),
  };

  out[`users/${UID}/diets/demo-diet-2`] = {
    name: "Volumen limpio",
    description: "Superávit ligero con 5 comidas y carbohidratos alrededor del entreno.",
    goal: "bulking",
    tags: ["volumen", "5 comidas"],
    imageUrl: IMAGES.skewers,
    targetCalories: 2900,
    targetMacros: { protein: 180, carbs: 340, fat: 85 },
    dishes: [
      { id: "v1", name: "French toast con plátano", type: "breakfast", description: "Brioche, plátano y arándanos.", imageUrl: IMAGES.frenchToast, calories: 520, macros: { protein: 14, carbs: 78, fat: 16 } },
      { id: "v2", name: "Brochetas mixtas", type: "dinner", description: "Pollo y cerdo con papas.", imageUrl: IMAGES.skewers, calories: 690, macros: { protein: 52, carbs: 30, fat: 38 } },
      { id: "v3", name: "Quinoa con judías verdes", type: "lunch", description: "Quinoa y judías salteadas.", imageUrl: IMAGES.quinoaPlate, calories: 420, macros: { protein: 16, carbs: 58, fat: 12 } },
    ],
    createdBy: "ai",
    status: "ready",
    createdAt: ts(at(15, 12).getTime()),
    updatedAt: ts(at(9, 12).getTime()),
  };

  return out;
}
