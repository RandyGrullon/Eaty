import type { PersonalizedNutritionTip } from "@/lib/food-analysis-schema";

export const STATIC_TIPS_NO_MEALS: PersonalizedNutritionTip[] = [
  {
    whatToChange:
      "Añade una porción generosa de vegetal (crudo o al vapor) a tu próxima comida principal",
    whereApply: "En el almuerzo o la cena, junto al plato que ya suelas tomar",
    whyItHelps:
      "Sube fibra y volumen con pocas calorías extra y mejora la saciedad.",
    recipeSearchQuery: "guarnición verduras rápidas sartén",
    miniSteps: [
      "Congela bolsas de mezcla de verduras picadas para saltear en 5 minutos.",
      "Sirve 1 taza de vegetal antes de repetir pan, arroz o fritos.",
    ],
  },
  {
    whatToChange:
      "Elige proteína magra o marisco y reduce salsas cremosas o mayonesa",
    whereApply: "Cuando pidas comida fuera o armes un sándwich o ensalada",
    whyItHelps: "Recorta grasa saturada y calorías “invisibles” de las salsas.",
    recipeSearchQuery: "ensalada proteína aderezo yogur limón",
    miniSteps: [
      "Pide aderezo aparte y moja el tenedor en lugar de verter sobre todo el plato.",
      "Sustituye mayonesa por yogur griego con mostaza y hierbas.",
    ],
  },
  {
    whatToChange:
      "Planifica un snack con proteína + fruta en lugar de solo ultraprocesado",
    whereApply: "Entre comidas, sobre todo a media tarde",
    whyItHelps: "Evita picos de hambre y picoteo impulsivo antes de la cena.",
    recipeSearchQuery: "snack saludable yogur frutos secos",
    miniSteps: [
      "Combina 150 g yogur natural con un puñado pequeño de frutos secos sin sal.",
      "Lleva fruta entera en la bolsa para cuando tengas 5 minutos entre reuniones.",
    ],
  },
  {
    whatToChange: "Bebe agua antes y durante la comida, sin sustituir el plato",
    whereApply: "En cada comida principal del día",
    whyItHelps: "A veces la sed se confunde con hambre; mejora digestión.",
    recipeSearchQuery: "infusiones sin azúcar caseras",
    miniSteps: [
      "Deja una botella visible en el escritorio o la mesa.",
      "Toma un vaso grande 15 minutos antes de servirte.",
    ],
  },
];

export const STATIC_TIPS_ERROR: PersonalizedNutritionTip[] = [
  {
    whatToChange:
      "Mantén mitad del plato para vegetales y divide el resto entre proteína y carbohidrato",
    whereApply: "En la próxima comida que puedas armar en casa o en buffet",
    whyItHelps: "Regla visual fácil sin pesar alimentos.",
    recipeSearchQuery: "plato saludable mitad verduras",
    miniSteps: [
      "Imagina un plato dividido en dos: una mitad solo vegetales.",
      "La otra mitad reparte en dos cuadrantes: proteína y carbohidrato.",
    ],
  },
  {
    whatToChange: "Camina 10 minutos después de comer en lugar de quedarte sentado",
    whereApply: "Después del almuerzo o la cena",
    whyItHelps: "Ayuda a la digestión y al control glucémico suave.",
    recipeSearchQuery: "rutina caminata después comer",
    miniSteps: [
      "Sal a la calle o sube y baja escaleras una sola vez.",
      "Evita pantallas esos 10 minutos para desconectar del picoteo.",
    ],
  },
  {
    whatToChange: "Revisa el tamaño de porción de aceite y mantequilla al cocinar",
    whereApply: "En el fogón: saltear, freír o mezclar ensaladas",
    whyItHelps: "El aceite suma muchas kcal por cucharada.",
    recipeSearchQuery: "cocinar con menos aceite sartén antiadherente",
    miniSteps: [
      "Usa spray o brochita y cuenta hasta 2 cucharaditas por plato.",
      "Prefiere horno, vapor o plancha antes que fritura profunda.",
    ],
  },
];
