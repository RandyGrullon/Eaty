import type { GeneratedDiet, DishTutorial } from "@/types/diet";

async function postJson<T>(
  url: string,
  idToken: string,
  body: unknown,
  key: string
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error de IA");
  return data[key] as T;
}

export function generateDietApi(
  idToken: string,
  body: {
    goal?: string;
    calories?: number;
    preferences?: string;
    restrictions?: string[];
    lang?: string;
  }
): Promise<GeneratedDiet> {
  return postJson<GeneratedDiet>("/api/diets/generate", idToken, body, "diet");
}

export function processDietApi(
  idToken: string,
  body: {
    name?: string;
    description?: string;
    goal?: string;
    dishes: Array<{ name: string; type: string; description?: string }>;
    lang?: string;
  }
): Promise<GeneratedDiet> {
  return postJson<GeneratedDiet>("/api/diets/process", idToken, body, "diet");
}

export function generateTutorialApi(
  idToken: string,
  body: {
    dishName: string;
    description?: string;
    servings?: number;
    lang?: string;
  }
): Promise<DishTutorial> {
  return postJson<DishTutorial>(
    "/api/diets/tutorial",
    idToken,
    body,
    "tutorial"
  );
}
