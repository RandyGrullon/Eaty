import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { uploadUserMealImage } from "@/lib/meal-image-storage";
import { logger } from "@/lib/logger";
import {
  mealFromDoc,
  queryMealsInRange,
} from "@/lib/firestore-meal-utils";
import type { Meal } from "@/types/meal";
import { getDb } from "./db";

export type MealUpdatePayload = {
  foodName: string;
  calories: number;
  macros: Meal["macros"];
  recommendations: string[];
  imageUrl: string | null;
  aiContext?: Meal["aiContext"];
};

export async function updateMeal(
  userId: string,
  mealId: string,
  data: MealUpdatePayload
): Promise<void> {
  try {
    const mealRef = doc(getDb(), "users", userId, "meals", mealId);
    await updateDoc(mealRef, {
      foodName: data.foodName,
      calories: data.calories,
      macros: data.macros,
      recommendations: data.recommendations,
      imageUrl: data.imageUrl,
      ...(data.aiContext !== undefined ? { aiContext: data.aiContext } : {}),
    });
  } catch (error) {
    logger.error("Error updating meal", error);
    throw new Error("Error al actualizar la comida");
  }
}

export async function deleteMeal(
  userId: string,
  mealId: string
): Promise<void> {
  try {
    await deleteDoc(doc(getDb(), "users", userId, "meals", mealId));
  } catch (error) {
    logger.error("Error deleting meal", error);
    throw new Error("Error al eliminar la comida");
  }
}

export type SaveMealOptions = {
  /** Foto usada en el análisis; se sube a Storage y se guarda `imageUrl` en el documento. */
  imageFile?: File;
};

export type SaveMealResult = {
  mealId: string;
  /** `true` si se pidió subir imagen y la subida y el update tuvieron éxito. */
  imageStored: boolean;
};

export async function saveMeal(
  userId: string,
  mealData: Omit<Meal, "id" | "createdAt">,
  options?: SaveMealOptions & { plannedDate?: Date }
): Promise<SaveMealResult> {
  try {
    const mealsRef = collection(getDb(), "users", userId, "meals");

    // Si ya tenemos base64 en imageUrl, lo usamos directamente.
    // De lo contrario, intentaremos subir el archivo si existe.
    const finalImageUrl = mealData.imageUrl ?? null;
    let imageStored = false;

    const docRef = await addDoc(mealsRef, {
      ...mealData,
      imageUrl: finalImageUrl,
      createdAt: options?.plannedDate
        ? Timestamp.fromDate(options.plannedDate)
        : Timestamp.now(),
      isPlanned: mealData.isPlanned ?? false,
    });

    if (options?.imageFile && !finalImageUrl) {
      try {
        const url = await uploadUserMealImage(
          userId,
          docRef.id,
          options.imageFile
        );
        await updateDoc(docRef, { imageUrl: url });
        imageStored = true;
      } catch (e) {
        logger.error("saveMeal: subida de imagen (comida guardada sin foto)", e);
      }
    } else if (finalImageUrl) {
      imageStored = true; // El base64 ya está guardado en el documento
    }

    return { mealId: docRef.id, imageStored };
  } catch (error) {
    logger.error("Error saving meal", error);
    throw new Error("Error al guardar la comida");
  }
}

export async function getUserMeals(userId: string): Promise<Meal[]> {
  try {
    return await queryMealsInRange(userId);
  } catch (error) {
    logger.error("Error fetching meals", error);
    throw new Error("Error al cargar el historial");
  }
}

export async function getMealsGroupedByDate(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ [key: string]: Meal[] }> {
  try {
    const meals = await queryMealsInRange(userId, startDate, endDate);
    const groups: { [key: string]: Meal[] } = {};
    meals.forEach((meal) => {
      const dateKey = meal.createdAt.toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(meal);
    });
    return groups;
  } catch (error) {
    logger.error("Error fetching meals grouped by date", error);
    throw new Error("Error al cargar las comidas agrupadas");
  }
}

export async function getRecentActivities(
  userId: string,
  limit: number = 5
): Promise<Meal[]> {
  try {
    return await queryMealsInRange(userId, undefined, undefined, limit);
  } catch (error) {
    logger.error("Error fetching recent activities", error);
    return [];
  }
}

// Reexport para call sites que importan utilidades de documento desde meals.
export { mealFromDoc };
