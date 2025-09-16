const GEMINI_API_KEY = "AIzaSyCmJZZ2Mm6i2WBv5GJVwzZ_jawJWtG8P5k"
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`

export async function analyzeFood(imageBase64?: string, foodName?: string): Promise<any> {
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
  }`

  const requestBody: any = {
    contents: [
      {
        parts: [],
      },
    ],
  }

  // Add text prompt
  requestBody.contents[0].parts.push({
    text: prompt,
  })

  // Add image if provided
  if (imageBase64) {
    requestBody.contents[0].parts.push({
      inline_data: {
        mime_type: "image/jpeg",
        data: imageBase64,
      },
    })
  }

  // Add food name if provided
  if (foodName) {
    requestBody.contents[0].parts.push({
      text: `Nombre del plato: ${foodName}`,
    })
  }

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates[0].content.parts[0].text

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    throw new Error("No valid JSON found in response")
  } catch (error) {
    console.error("Error analyzing food:", error)
    throw error
  }
}
