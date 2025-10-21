const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyCBSN-F1jGQurbG9SMHOhOZ3X-s9LrNylo";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

export async function analyzeFood(
  imageBase64?: string,
  foodName?: string,
  description?: string
): Promise<any> {
  const prompt = `Analiza esta comida y estima las calorías y macros principales (proteínas, carbohidratos, grasas, fibra, azúcar). 
  Da un resumen detallado de los nutrientes por porción y su total. 
  Luego, ofrece 2-3 recomendaciones de mejora para una próxima comida más saludable.
  
  Responde en formato JSON con esta estructura exacta:
  {
    "foodName": "nombre del plato",
    "calories": número,
    "macros": {
      "protein": número,
      "carbs": número,
      "fat": número,
      "fiber": número,
      "sugar": número
    },
    "recommendations": ["recomendación 1", "recomendación 2", "recomendación 3"]
  }`;

  const requestBody: any = {
    contents: [
      {
        parts: [],
      },
    ],
  };

  // Add text prompt
  requestBody.contents[0].parts.push({
    text: prompt,
  });

  // Add image if provided
  if (imageBase64) {
    requestBody.contents[0].parts.push({
      inline_data: {
        mime_type: "image/jpeg",
        data: imageBase64,
      },
    });
  }

  // Add food name if provided
  if (foodName) {
    requestBody.contents[0].parts.push({
      text: `Nombre del plato: ${foodName}`,
    });
  }

  // Add description if provided
  if (description) {
    requestBody.contents[0].parts.push({
      text: `Descripción adicional: ${description}`,
    });
  }

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error("No valid JSON found in response");
  } catch (error) {
    console.error("Error analyzing food:", error);
    throw error;
  }
}

export async function calculateTDEEPrecise(userProfile: {
  age: number;
  gender: "male" | "female" | "other";
  weight: number; // kg
  height: number; // cm
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
  fitnessGoal: "bulking" | "shedding" | "maintenance";
}): Promise<{
  bmr: number;
  tdee: number;
  dailyCalories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  explanation: string;
}> {
  // Cálculos precisos usando fórmulas estándar

  // 1. Calcular BMR usando Mifflin-St Jeor
  let bmr: number;
  if (userProfile.gender === "male") {
    bmr =
      10 * userProfile.weight +
      6.25 * userProfile.height -
      5 * userProfile.age +
      5;
  } else if (userProfile.gender === "female") {
    bmr =
      10 * userProfile.weight +
      6.25 * userProfile.height -
      5 * userProfile.age -
      161;
  } else {
    // Para "other", usar promedio
    bmr =
      10 * userProfile.weight +
      6.25 * userProfile.height -
      5 * userProfile.age -
      78;
  }

  // 2. Calcular TDEE multiplicando por factor de actividad
  const activityFactors = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const tdee = Math.round(bmr * activityFactors[userProfile.activityLevel]);
  const bmrRounded = Math.round(bmr);

  // 3. Ajustar calorías según objetivo
  let dailyCalories: number;
  let explanation: string;

  switch (userProfile.fitnessGoal) {
    case "maintenance":
      dailyCalories = tdee;
      explanation = `Tu TDEE es de ${tdee} calorías diarias para mantener tu peso actual. Este cálculo se basa en tu metabolismo basal de ${bmrRounded} calorías y tu nivel de actividad.`;
      break;

    case "bulking":
      dailyCalories = tdee + 400;
      explanation = `Para ganar masa muscular, necesitas ${dailyCalories} calorías diarias (TDEE ${tdee} + 400 calorías de superávit). Este superávit moderado te permitirá ganar ~0.25-0.5kg de músculo por mes con entrenamiento adecuado.`;
      break;

    case "shedding":
      dailyCalories = tdee - 500;
      explanation = `Para perder grasa corporal, necesitas ${dailyCalories} calorías diarias (TDEE ${tdee} - 500 calorías de déficit). Este déficit te permitirá perder ~0.5kg de grasa por semana de forma sostenible.`;
      break;

    default:
      dailyCalories = tdee;
      explanation = `Cálculo estándar de mantenimiento: ${tdee} calorías diarias.`;
  }

  // 4. Calcular macronutrientes basados en el objetivo
  let macros: { protein: number; carbs: number; fat: number };

  switch (userProfile.fitnessGoal) {
    case "maintenance":
      macros = {
        protein: Math.round(userProfile.weight * 2.0), // 2.0g por kg
        carbs: Math.round((dailyCalories * 0.45) / 4), // 45% de calorías de carbs
        fat: Math.round((dailyCalories * 0.25) / 9), // 25% de calorías de grasa
      };
      break;

    case "bulking":
      macros = {
        protein: Math.round(userProfile.weight * 2.2), // 2.2g por kg para ganar músculo
        carbs: Math.round((dailyCalories * 0.55) / 4), // 55% de calorías de carbs para energía
        fat: Math.round((dailyCalories * 0.225) / 9), // 22.5% de calorías de grasa
      };
      break;

    case "shedding":
      macros = {
        protein: Math.round(userProfile.weight * 2.5), // 2.5g por kg para preservar músculo
        carbs: Math.round((dailyCalories * 0.35) / 4), // 35% de calorías de carbs (reducido)
        fat: Math.round((dailyCalories * 0.3) / 9), // 30% de calorías de grasa para saciedad
      };
      break;

    default:
      macros = {
        protein: Math.round(userProfile.weight * 2.0),
        carbs: Math.round((dailyCalories * 0.45) / 4),
        fat: Math.round((dailyCalories * 0.25) / 9),
      };
  }

  return {
    bmr: bmrRounded,
    tdee,
    dailyCalories,
    macros,
    explanation,
  };
}

export async function calculateTDEE(userProfile: {
  age: number;
  gender: "male" | "female" | "other";
  weight: number; // kg
  height: number; // cm
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
  fitnessGoal: "bulking" | "shedding" | "maintenance";
}): Promise<{
  bmr: number;
  tdee: number;
  dailyCalories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  explanation: string;
}> {
  const prompt = `Calcula el TDEE (Total Daily Energy Expenditure) y las necesidades calóricas diarias para esta persona basándote en sus datos y objetivo de fitness.

Datos del usuario:
- Edad: ${userProfile.age} años
- Género: ${
    userProfile.gender === "male"
      ? "Masculino"
      : userProfile.gender === "female"
      ? "Femenino"
      : "Otro"
  }
- Peso: ${userProfile.weight} kg
- Altura: ${userProfile.height} cm
- Nivel de actividad: ${
    userProfile.activityLevel === "sedentary"
      ? "Sedentario"
      : userProfile.activityLevel === "light"
      ? "Ligero (ejercicio 1-3 días/semana)"
      : userProfile.activityLevel === "moderate"
      ? "Moderado (ejercicio 3-5 días/semana)"
      : userProfile.activityLevel === "active"
      ? "Activo (ejercicio 6-7 días/semana)"
      : "Muy activo (ejercicio intenso o trabajo físico)"
  }
- Objetivo: ${
    userProfile.fitnessGoal === "bulking"
      ? "Ganar masa muscular (Bulking)"
      : userProfile.fitnessGoal === "shedding"
      ? "Perder peso (Shedding)"
      : "Mantener peso (Maintenance)"
  }

Por favor calcula:
1. BMR (Basal Metabolic Rate) usando la fórmula de Mifflin-St Jeor
2. TDEE multiplicando BMR por el factor de actividad
3. Calorías diarias recomendadas basadas en el objetivo:
   - Maintenance: TDEE
   - Bulking: TDEE + 400 calorías (superávit para ganar masa muscular)
   - Shedding: TDEE - 500 calorías (déficit para perder grasa)
4. Distribución de macronutrientes recomendada en gramos por día
5. Una explicación breve de los cálculos

Responde en formato JSON con esta estructura exacta:
{
  "bmr": número,
  "tdee": número,
  "dailyCalories": número,
  "macros": {
    "protein": número,
    "carbs": número,
    "fat": número
  },
  "explanation": "string con explicación breve"
}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);

      // Validate the response structure
      if (
        result.bmr &&
        result.tdee &&
        result.dailyCalories &&
        result.macros &&
        result.explanation
      ) {
        return result;
      }
    }

    throw new Error("No valid JSON found in response");
  } catch (error) {
    console.error("Error calculating TDEE:", error);
    throw error;
  }
}

export async function generateNutritionTips(
  meals: Array<{
    foodName: string;
    calories: number;
    macros: { protein: number; carbs: number; fat: number };
  }>,
  totalCalories: number,
  dailyGoal?: number
): Promise<string[]> {
  const prompt = `Basado en las comidas consumidas por el usuario hoy, genera 3-5 consejos nutricionales personalizados y útiles. 

Comidas consumidas:
${meals
  .map(
    (meal) =>
      `- ${meal.foodName}: ${meal.calories} calorías (${meal.macros.protein}g proteína, ${meal.macros.carbs}g carbohidratos, ${meal.macros.fat}g grasa)`
  )
  .join("\n")}

Total de calorías consumidas: ${totalCalories}
${dailyGoal ? `Meta diaria de calorías: ${dailyGoal}` : ""}

Los consejos deben ser:
1. Personalizados basados en las comidas específicas
2. Prácticos y accionables
3. Enfocados en mejorar hábitos nutricionales
4. Motivadores y positivos
5. En español

Responde con un array JSON de strings, cada uno siendo un consejo breve (máximo 100 caracteres).

Ejemplo de respuesta:
["Añade más verduras a tu próxima comida para equilibrar los macronutrientes", "Considera incluir una fuente de fibra adicional mañana", "¡Excelente trabajo manteniendo el balance calórico!"]`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;

    // Extract JSON array from the response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const tips = JSON.parse(jsonMatch[0]);
      return Array.isArray(tips) ? tips : [];
    }

    // Fallback: extract individual tips from text
    const lines = text
      .split("\n")
      .filter(
        (line: string) =>
          line.trim().length > 0 && !line.includes("[") && !line.includes("]")
      );
    return lines.slice(0, 5);
  } catch (error) {
    console.error("Error generating nutrition tips:", error);
    return [
      "Mantén un equilibrio entre proteínas, carbohidratos y grasas saludables",
      "Incluye verduras en cada comida para mejorar la nutrición",
      "Bebe suficiente agua durante el día",
    ];
  }
}
