const GEMINI_API_KEY = "AIzaSyCmJZZ2Mm6i2WBv5GJVwzZ_jawJWtG8P5k";
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

export async function generateNutritionTips(
  meals: Array<{ foodName: string; calories: number; macros: { protein: number; carbs: number; fat: number } }>,
  totalCalories: number,
  dailyGoal?: number
): Promise<string[]> {
  const prompt = `Basado en las comidas consumidas por el usuario hoy, genera 3-5 consejos nutricionales personalizados y útiles. 

Comidas consumidas:
${meals.map(meal => `- ${meal.foodName}: ${meal.calories} calorías (${meal.macros.protein}g proteína, ${meal.macros.carbs}g carbohidratos, ${meal.macros.fat}g grasa)`).join('\n')}

Total de calorías consumidas: ${totalCalories}
${dailyGoal ? `Meta diaria de calorías: ${dailyGoal}` : ''}

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
    const lines = text.split('\n').filter((line: string) => line.trim().length > 0 && !line.includes('[') && !line.includes(']'));
    return lines.slice(0, 5);
  } catch (error) {
    console.error("Error generating nutrition tips:", error);
    return [
      "Mantén un equilibrio entre proteínas, carbohidratos y grasas saludables",
      "Incluye verduras en cada comida para mejorar la nutrición",
      "Bebe suficiente agua durante el día"
    ];
  }
}
