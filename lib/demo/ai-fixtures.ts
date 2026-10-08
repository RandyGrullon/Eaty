/**
 * Respuestas de IA del modo demo (sin GROQ_API_KEY). Son deterministas pero
 * dependen de la entrada para que el recorrido se sienta real.
 */
import type { FoodAnalysisMealFields, PersonalizedNutritionTip } from "@/lib/food-analysis-schema";
import type { CoachInsight } from "@/lib/coach-schema";
import type { GeneratedWorkout } from "@/types/workout";
import type { DishTutorial, GeneratedDiet } from "@/types/diet";

/** Demo activo en el servidor y sin clave de Groq: usar respuestas simuladas. */
export function isDemoAi(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "1" && !process.env.GROQ_API_KEY?.trim();
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type DishFixture = Omit<FoodAnalysisMealFields, "aiContext"> & {
  keywords: string[];
  description: string;
  components: Array<{ name: string; grams: number; kcal: number }>;
  container: string;
};

const DISHES: DishFixture[] = [
  {
    keywords: ["pasta", "espagueti", "spaghetti", "macarr", "lasaña"],
    foodName: "Espaguetis a la boloñesa",
    calories: 620,
    macros: { protein: 28, carbs: 78, fat: 20, fiber: 6, sugar: 9 },
    recommendations: [
      "Buena dosis de energía para antes de entrenar",
      "Acompaña con ensalada verde para sumar fibra",
      "Si buscas déficit, reduce la pasta a 3/4 de plato",
    ],
    description: "Plato de espaguetis con salsa de tomate y carne picada, queso rallado por encima.",
    components: [
      { name: "espaguetis cocidos", grams: 220, kcal: 345 },
      { name: "salsa boloñesa", grams: 150, kcal: 215 },
      { name: "queso parmesano", grams: 12, kcal: 60 },
    ],
    container: "plato hondo de 24 cm",
  },
  {
    keywords: ["ensalada", "salad", "lechuga"],
    foodName: "Ensalada César con pollo",
    calories: 470,
    macros: { protein: 36, carbs: 18, fat: 28, fiber: 4, sugar: 4 },
    recommendations: [
      "Alta en proteína y saciante",
      "La salsa concentra la grasa: pídela aparte",
      "Añade garbanzos si necesitas más carbohidrato",
    ],
    description: "Lechuga romana con pechuga de pollo a la plancha, crutones, parmesano y salsa César.",
    components: [
      { name: "pollo a la plancha", grams: 120, kcal: 200 },
      { name: "lechuga romana", grams: 100, kcal: 17 },
      { name: "crutones", grams: 20, kcal: 80 },
      { name: "salsa césar", grams: 30, kcal: 140 },
      { name: "parmesano", grams: 8, kcal: 33 },
    ],
    container: "bol amplio de 22 cm",
  },
  {
    keywords: ["arroz", "pollo", "bowl", "poke"],
    foodName: "Bowl de arroz con pollo y verduras",
    calories: 580,
    macros: { protein: 42, carbs: 64, fat: 15, fiber: 7, sugar: 6 },
    recommendations: [
      "Reparto de macros muy equilibrado",
      "Buena elección para el almuerzo",
      "Usa arroz integral para más fibra",
    ],
    description: "Arroz blanco con pollo salteado, brócoli, zanahoria y salsa de soja.",
    components: [
      { name: "arroz blanco", grams: 180, kcal: 235 },
      { name: "pollo salteado", grams: 140, kcal: 230 },
      { name: "brócoli y zanahoria", grams: 120, kcal: 45 },
      { name: "aceite y salsa", grams: 12, kcal: 70 },
    ],
    container: "bol de 18 cm",
  },
  {
    keywords: ["huevo", "tostada", "desayuno", "aguacate"],
    foodName: "Tostadas con huevo y aguacate",
    calories: 410,
    macros: { protein: 18, carbs: 34, fat: 22, fiber: 8, sugar: 3 },
    recommendations: ["Desayuno con grasas saludables", "Suma una fruta para completar"],
    description: "Dos tostadas de pan integral con aguacate machacado y huevo a la plancha.",
    components: [
      { name: "pan integral", grams: 70, kcal: 170 },
      { name: "aguacate", grams: 60, kcal: 96 },
      { name: "huevo", grams: 55, kcal: 90 },
      { name: "aceite", grams: 5, kcal: 45 },
    ],
    container: "plato llano de 26 cm",
  },
  {
    keywords: ["pizza"],
    foodName: "Pizza margarita (2 porciones)",
    calories: 560,
    macros: { protein: 24, carbs: 66, fat: 21, fiber: 4, sugar: 6 },
    recommendations: ["Comida más calórica: equilibra el resto del día", "Añade una ensalada como entrante"],
    description: "Dos porciones de pizza con tomate, mozzarella y albahaca.",
    components: [
      { name: "masa", grams: 140, kcal: 330 },
      { name: "mozzarella", grams: 60, kcal: 170 },
      { name: "salsa de tomate", grams: 50, kcal: 30 },
    ],
    container: "tabla de madera",
  },
];

function pickDish(text: string): DishFixture {
  const t = text.toLowerCase();
  const hit = DISHES.find((d) => d.keywords.some((k) => t.includes(k)));
  if (hit) return hit;
  // Sin pista (p. ej. foto): elegimos uno estable según el tamaño de la entrada.
  return DISHES[text.length % DISHES.length];
}

export async function demoFoodAnalysis(params: {
  imageBase64?: string;
  foodName?: string;
  description?: string;
}): Promise<FoodAnalysisMealFields> {
  await wait(1800);
  const text = [params.foodName, params.description].filter(Boolean).join(" ");
  const dish = pickDish(text || String(params.imageBase64?.length ?? 0));
  const name = params.foodName?.trim() && !pickDish(params.foodName).keywords.some((k) => params.foodName!.toLowerCase().includes(k))
    ? params.foodName.trim()
    : dish.foodName;
  return {
    foodName: name,
    calories: dish.calories,
    macros: dish.macros,
    recommendations: dish.recommendations,
    aiContext: {
      dishDescription: dish.description,
      visibleComponents: dish.components.map((c) => c.name),
      confidence: params.imageBase64 ? "medium" : "high",
      portionLabel: "Porción aprox. mediana / estándar",
      containerType: dish.container,
      estimatedWeightGrams: dish.components.reduce((a, c) => a + c.grams, 0),
      componentBreakdown: dish.components.map((c) => ({
        name: c.name,
        estimatedGrams: c.grams,
        calories: c.kcal,
      })),
    },
  };
}

export async function demoNutritionTips(): Promise<PersonalizedNutritionTip[]> {
  await wait(900);
  return [
    {
      whatToChange: "Sube la proteína del desayuno añadiendo yogur griego o huevos",
      whereApply: "En el desayuno, que hoy fue el más bajo en proteína",
      whyItHelps: "Repartir la proteína en el día mejora la saciedad y la recuperación",
      recipe: {
        title: "Bowl de yogur griego con frutos rojos",
        ingredients: ["200 g de yogur griego", "100 g de frutos rojos", "15 g de nueces", "1 cdta de miel"],
        steps: ["Sirve el yogur en un bol amplio.", "Añade los frutos rojos y las nueces troceadas por encima."],
      },
      miniSteps: ["Compra yogur griego natural sin azúcar", "Prepara el bol la noche anterior si vas con prisa"],
    },
    {
      whatToChange: "Cambia la guarnición de papas por verduras asadas dos cenas a la semana",
      whereApply: "En las cenas con carne o pescado",
      whyItHelps: "Bajas unas 200 kcal por cena manteniendo el volumen del plato",
      recipe: {
        title: "Verduras asadas al horno",
        ingredients: ["1 calabacín", "1 pimiento rojo", "1 cebolla", "1 cda de aceite de oliva"],
        steps: ["Corta las verduras en trozos parecidos.", "Hornea 25 minutos a 200 °C con aceite y sal."],
      },
      miniSteps: ["Corta verduras para dos días de una vez", "Usa la bandeja grande para que se doren"],
    },
    {
      whatToChange: "Bebe un vaso de agua antes de cada comida principal",
      whereApply: "Antes del almuerzo y la cena",
      whyItHelps: "Ayuda a llegar a la meta de hidratación y a comer con menos ansiedad",
      recipe: {
        title: "Agua con limón y menta",
        ingredients: ["1 L de agua fría", "1/2 limón en rodajas", "Hojas de menta"],
        steps: ["Mezcla todo en una jarra.", "Deja reposar 10 minutos en la nevera antes de servir."],
      },
      miniSteps: ["Deja una botella visible en tu mesa", "Marca cada vaso en Eaty"],
    },
  ];
}

export async function demoCoachChat(_message: string): Promise<string> {
  await wait(1100);
  return [
    "Mirando lo que llevas registrado hoy:",
    "",
    "- **Hoy vas bien de proteína**, pero te quedan carbohidratos para la cena.",
    "- Una opción rápida: **bowl de arroz integral con salmón y verduras** (~550 kcal).",
    "- Si entrenas mañana temprano, deja preparada avena con plátano.",
    "",
    "_Modo demo: respuesta de ejemplo. Con una clave de Groq el coach responde con tus datos reales._",
  ].join("\n");
}

export async function demoCoachInsight(): Promise<CoachInsight> {
  await wait(900);
  return {
    focusTitle: "Cierra el día con proteína",
    focusMessage:
      "Llevas un buen ritmo de calorías. Te faltan unos 40 g de proteína para tu meta: prioriza una cena con pescado, huevo o legumbres.",
    nextMeal: {
      title: "Salmón con quinoa y espárragos",
      idea: "Lomo de salmón al horno, media taza de quinoa y espárragos a la plancha con limón.",
      approxCalories: 560,
    },
    training: {
      title: "Paseo activo de 30 minutos",
      idea: "Hoy toca descanso activo: camina a ritmo ligero después de cenar para mejorar la digestión.",
    },
    motivation: "Cuatro días seguidos registrando. La constancia es lo que mueve la aguja.",
  };
}

export async function demoWorkout(): Promise<GeneratedWorkout> {
  await wait(1500);
  return {
    title: "Fuerza total 3 días",
    goal: "Ganar fuerza y mantener masa muscular en déficit",
    daysPerWeek: 3,
    level: "intermediate",
    estimatedCaloriesPerSession: 380,
    warmup: ["5 min de bici suave", "Movilidad de cadera y hombros", "2 series ligeras del primer ejercicio"],
    days: [
      {
        day: "Día 1 — Empuje",
        focus: "Pecho, hombro y tríceps",
        exercises: [
          { name: "Press banca", sets: 4, reps: "6-8", restSec: 120 },
          { name: "Press militar con mancuernas", sets: 3, reps: "8-10", restSec: 90 },
          { name: "Fondos asistidos", sets: 3, reps: "10-12", restSec: 75 },
        ],
      },
      {
        day: "Día 2 — Pierna",
        focus: "Cuádriceps, glúteo e isquios",
        exercises: [
          { name: "Sentadilla", sets: 4, reps: "6-8", restSec: 150 },
          { name: "Peso muerto rumano", sets: 3, reps: "8-10", restSec: 120 },
          { name: "Zancadas caminando", sets: 3, reps: "12 por pierna", restSec: 75 },
        ],
      },
      {
        day: "Día 3 — Tirón",
        focus: "Espalda y bíceps",
        exercises: [
          { name: "Dominadas", sets: 4, reps: "Al fallo técnico", restSec: 120 },
          { name: "Remo con barra", sets: 3, reps: "8-10", restSec: 90 },
          { name: "Curl con mancuernas", sets: 3, reps: "10-12", restSec: 60 },
        ],
      },
    ],
    tips: ["Sube el peso cuando completes todas las series en el rango alto", "Duerme 7-8 horas para recuperar"],
  };
}

export async function demoDiet(goalHint?: string): Promise<GeneratedDiet> {
  await wait(2000);
  const bulking = /volumen|bulk|ganar|músculo/i.test(goalHint ?? "");
  return {
    name: bulking ? "Volumen limpio en 5 comidas" : "Déficit suave alto en proteína",
    description: bulking
      ? "Superávit ligero con carbohidratos alrededor del entreno y proteína en cada comida."
      : "Déficit de ~400 kcal con proteína alta, verduras en cada plato y grasas de calidad.",
    goal: bulking ? "bulking" : "shedding",
    tags: bulking ? ["volumen", "5 comidas"] : ["alta en proteína", "fácil de cocinar"],
    targetCalories: bulking ? 2900 : 1950,
    targetMacros: bulking ? { protein: 180, carbs: 340, fat: 85 } : { protein: 150, carbs: 180, fat: 65 },
    dishes: [
      { name: "Avena con plátano y mantequilla de cacahuete", type: "breakfast", description: "Avena cocida con leche, plátano y una cucharada de crema de cacahuete.", calories: 480, macros: { protein: 20, carbs: 68, fat: 14 } },
      { name: "Pollo al limón con arroz integral", type: "lunch", description: "Pechuga marinada con limón y ajo, arroz integral y brócoli.", calories: 590, macros: { protein: 48, carbs: 62, fat: 14 } },
      { name: "Merluza al horno con verduras", type: "dinner", description: "Merluza con pimiento, calabacín y aceite de oliva.", calories: 420, macros: { protein: 38, carbs: 22, fat: 18 } },
      { name: "Yogur griego con nueces", type: "snack", description: "Yogur natural con nueces y canela.", calories: 220, macros: { protein: 16, carbs: 12, fat: 12 } },
    ],
  };
}

export async function demoDishTutorial(dishName: string): Promise<DishTutorial> {
  await wait(1500);
  return {
    servings: 1,
    prepTimeMin: 10,
    cookTimeMin: 20,
    difficulty: "easy",
    equipment: ["Sartén antiadherente", "Tabla de cortar", "Cuchillo"],
    ingredients: [
      { item: "Ingrediente principal", amount: "150 g" },
      { item: "Verduras de temporada", amount: "200 g" },
      { item: "Aceite de oliva", amount: "1 cda" },
      { item: "Sal y pimienta", amount: "al gusto" },
    ],
    steps: [
      { n: 1, title: "Prepara los ingredientes", detail: `Lava y corta todo lo necesario para ${dishName}. Ten cada cosa a mano antes de encender el fuego.`, durationMin: 10 },
      { n: 2, title: "Cocina a fuego medio", detail: "Calienta el aceite y cocina el ingrediente principal hasta dorar por ambos lados.", durationMin: 12, tip: "No muevas la pieza hasta que se despegue sola." },
      { n: 3, title: "Termina y emplata", detail: "Saltea las verduras 5 minutos, ajusta la sal y sirve todo junto en el plato.", durationMin: 8 },
    ],
    commonMistakes: ["Llenar demasiado la sartén: el alimento se cuece en vez de dorarse"],
    plating: "Sirve en plato llano, verduras debajo y la proteína encima.",
  };
}
