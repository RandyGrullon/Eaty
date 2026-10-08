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
import { buildMealDocFields, dataUrlToFile, isDataUrl } from "@/lib/meal-doc";
import type { Meal } from "@/types/meal";
import { getDb } from "./db";

export type MealUpdatePayload = {
  foodName: string;
  calories: number;
  macros: Meal["macros"];
  recommendations: string[];
  imageUrl: string | null;
  aiContext?: Meal["aiContext"];
  /** Si se incluye, reescribe la fecha/hora del registro. */
  createdAt?: Date;
};

export async function updateMeal(
  userId: string,
  mealId: string,
  data: MealUpdatePayload
): Promise<void> {
  try {
    const mealRef = doc(getDb(), "users", userId, "meals", mealId);
    // Un data URL no se guarda en Firestore: se sube a Storage. Si falla, se
    // conserva la foto anterior (no se toca `imageUrl`).
    let imagePatch: { imageUrl?: string | null } = { imageUrl: data.imageUrl };
    if (isDataUrl(data.imageUrl)) {
      imagePatch = {};
      const file = dataUrlToFile(data.imageUrl);
      if (file) {
        try {
          imagePatch = {
            imageUrl: await uploadUserMealImage(userId, mealId, file),
          };
        } catch (e) {
          logger.error("updateMeal: subida de imagen", e);
        }
      }
    }
    await updateDoc(mealRef, {
      foodName: data.foodName,
      calories: data.calories,
      macros: data.macros,
      recommendations: data.recommendations,
      ...imagePatch,
      ...(data.aiContext !== undefined ? { aiContext: data.aiContext } : {}),
      ...(data.createdAt !== undefined
        ? { createdAt: Timestamp.fromDate(data.createdAt) }
        : {}),
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

    // Nunca guardamos data URLs (base64) en Firestore: el documento podría
    // superar 1 MiB. Si llega uno sin archivo, se convierte a File y se sube.
    let imageFile = options?.imageFile;
    if (!imageFile && isDataUrl(mealData.imageUrl)) {
      imageFile = dataUrlToFile(mealData.imageUrl) ?? undefined;
    }
    const fields = buildMealDocFields(mealData);

    const createdAt =
      options?.plannedDate && !Number.isNaN(options.plannedDate.getTime())
        ? Timestamp.fromDate(options.plannedDate)
        : Timestamp.now();

    const docRef = await addDoc(mealsRef, { ...fields, createdAt });

    let imageStored = false;
    if (imageFile) {
      try {
        const url = await uploadUserMealImage(userId, docRef.id, imageFile);
        await updateDoc(docRef, { imageUrl: url });
        imageStored = true;
      } catch (e) {
        logger.error("saveMeal: subida de imagen (comida guardada sin foto)", e);
      }
    } else if (fields.imageUrl) {
      imageStored = true; // URL remota (p. ej. imagen generada) ya guardada.
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
