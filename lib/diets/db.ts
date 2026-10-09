import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { appFirebase } from "@/lib/firebase";
import { logger } from "@/lib/logger";
import type { Diet, DietDish, DishTutorial } from "@/types/diet";

const getDb = () => appFirebase.db;

/** Elimina claves `undefined` (Firestore las rechaza) preservando `null`. */
function clean<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export function dietFromDoc(d: QueryDocumentSnapshot<DocumentData>): Diet {
  const data = d.data();
  const toDate = (v: unknown) =>
    v instanceof Timestamp ? v.toDate() : new Date(0);
  return {
    id: d.id,
    name: data.name ?? "Dieta",
    description: data.description ?? "",
    goal: data.goal ?? "balanced",
    tags: Array.isArray(data.tags) ? data.tags : [],
    imageUrl: data.imageUrl ?? null,
    targetCalories: data.targetCalories ?? 0,
    targetMacros: {
      protein: data.targetMacros?.protein ?? 0,
      carbs: data.targetMacros?.carbs ?? 0,
      fat: data.targetMacros?.fat ?? 0,
    },
    dishes: Array.isArray(data.dishes) ? (data.dishes as DietDish[]) : [],
    createdBy: data.createdBy === "user" ? "user" : "ai",
    status: data.status === "draft" ? "draft" : "ready",
    plan: data.plan && data.plan.source === "builder" ? (data.plan as Diet["plan"]) : undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export type NewDiet = Omit<Diet, "id" | "createdAt" | "updatedAt">;

export async function createDiet(
  userId: string,
  diet: NewDiet
): Promise<string> {
  try {
    const ref = collection(getDb(), "users", userId, "diets");
    const now = Timestamp.now();
    const docRef = await addDoc(ref, {
      ...clean(diet),
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (e) {
    logger.error("Error creating diet", e);
    throw new Error("Error al crear la dieta");
  }
}

export async function updateDiet(
  userId: string,
  dietId: string,
  patch: Partial<NewDiet>
): Promise<void> {
  try {
    const ref = doc(getDb(), "users", userId, "diets", dietId);
    await updateDoc(ref, { ...clean(patch), updatedAt: Timestamp.now() });
  } catch (e) {
    logger.error("Error updating diet", e);
    throw new Error("Error al actualizar la dieta");
  }
}

export async function deleteDiet(
  userId: string,
  dietId: string
): Promise<void> {
  try {
    await deleteDoc(doc(getDb(), "users", userId, "diets", dietId));
  } catch (e) {
    logger.error("Error deleting diet", e);
    throw new Error("Error al eliminar la dieta");
  }
}

/** Guarda el tutorial generado de un plato dentro de su dieta. */
export async function saveDishTutorial(
  userId: string,
  diet: Diet,
  dishId: string,
  tutorial: DishTutorial
): Promise<void> {
  const dishes = diet.dishes.map((d) =>
    d.id === dishId ? { ...d, tutorial } : d
  );
  await updateDiet(userId, diet.id, { dishes });
}

/** Guarda la URL de imagen generada de un plato. */
export async function saveDishImage(
  userId: string,
  diet: Diet,
  dishId: string,
  imageUrl: string
): Promise<void> {
  const dishes = diet.dishes.map((d) =>
    d.id === dishId ? { ...d, imageUrl } : d
  );
  await updateDiet(userId, diet.id, { dishes });
}
