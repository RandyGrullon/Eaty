import type { PersonalizedNutritionTip } from "@/lib/food-analysis-schema";

export const STATIC_TIPS_NO_MEALS: PersonalizedNutritionTip[] = [
  {
    whatToChange:
      "Añade una porción generosa de vegetal (crudo o al vapor) a tu próxima comida principal",
    whereApply: "En el almuerzo o la cena, junto al plato que ya suelas tomar",
    whyItHelps:
      "Sube fibra y volumen con pocas calorías extra y mejora la saciedad.",
    recipe: {
      title: "Salteado de Verduras Arcoiris",
      ingredients: ["1 taza de brócoli", "1 zanahoria en rodajas", "1/2 pimiento rojo", "1 cda de aceite de oliva"],
      steps: ["Corta todas las verduras en trozos uniformes.", "Saltea en una sartén con aceite de oliva por 5-7 minutos.", "Sazona con una pizca de sal y pimienta."]
    },
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
    recipe: {
      title: "Aderezo Fit de Yogur y Limón",
      ingredients: ["3 cdas de yogur griego natural", "Jugo de 1/2 limón", "Hierbas secas (orégano, albahaca)", "Sal y pimienta"],
      steps: ["Mezcla todos los ingredientes en un cuenco pequeño.", "Bate hasta que la textura sea homogénea.", "Usa como sustituto de la mayonesa en tus platos."]
    },
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
    recipe: {
      title: "Bowl Energético de Yogur",
      ingredients: ["150g de yogur natural", "1 manzana picada", "1 puñado de nueces"],
      steps: ["Coloca el yogur en un bowl.", "Añade la fruta picada y las nueces por encima.", "Mezcla y disfruta lentamente."]
    },
    miniSteps: [
      "Combina 150 g yogur natural con un puñado pequeño de frutos secos sin sal.",
      "Lleva fruta entera en la bolsa para cuando tengas 5 minutos entre reuniones.",
    ],
  },
];

export const STATIC_TIPS_ERROR: PersonalizedNutritionTip[] = [
  {
    whatToChange:
      "Mantén mitad del plato para vegetales y divide el resto entre proteína y carbohidrato",
    whereApply: "En la próxima comida que puedas armar en casa o en buffet",
    whyItHelps: "Regla visual fácil sin pesar alimentos.",
    recipe: {
      title: "Plato Balanceado Eaty",
      ingredients: ["2 tazas de espinacas", "100g de pollo a la plancha", "1/2 taza de quinoa cocida"],
      steps: ["Llena la mitad de tu plato con las espinacas frescas.", "Añade el pollo en un cuarto del plato.", "Completa el último cuarto con la quinoa."]
    },
    miniSteps: [
      "Imagina un plato dividido en dos: una mitad solo vegetales.",
      "La otra mitad reparte en dos cuadrantes: proteína y carbohidrato.",
    ],
  },
];
