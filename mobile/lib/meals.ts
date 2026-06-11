import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit as limitFn,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { appFirebase } from "@/lib/firebase";
import type { Meal } from "@/types/meal";

/**
 * Misma colección `users/{uid}/meals` y mismos campos que la web
 * (ver lib/meals/meals.ts y lib/firestore-meal-utils.ts en el repo raíz):
 * los registros hechos desde el móvil aparecen en la web y viceversa.
 */
export function mealFromDoc(d: QueryDocumentSnapshot<DocumentData>): Meal {
  const data = d.data();
  const rawCreatedAt = data.createdAt;
  const createdAt =
    rawCreatedAt instanceof Timestamp
      ? rawCreatedAt.toDate()
      : rawCreatedAt instanceof Date
        ? rawCreatedAt
        : new Date(0);

  return {
    id: d.id,
    imageUrl: data.imageUrl ?? null,
    foodName: data.foodName ?? "",
    calories: data.calories ?? 0,
    macros: {
      protein: data.macros?.protein ?? 0,
      carbs: data.macros?.carbs ?? 0,
      fat: data.macros?.fat ?? 0,
      fiber: data.macros?.fiber ?? 0,
      sugar: data.macros?.sugar ?? 0,
    },
    recommendations: Array.isArray(data.recommendations)
      ? data.recommendations
      : [],
    aiContext: data.aiContext,
    mood: data.mood,
    isPlanned: data.isPlanned ?? false,
    createdAt,
  };
}

/** Escucha en vivo las comidas del usuario (más recientes primero). */
export function listenToMeals(
  userId: string,
  onMeals: (meals: Meal[]) => void,
  onError: (e: Error) => void,
  opts?: { start?: Date; limit?: number }
): () => void {
  const constraints: QueryConstraint[] = [];
  if (opts?.start) {
    constraints.push(where("createdAt", ">=", Timestamp.fromDate(opts.start)));
  }
  constraints.push(orderBy("createdAt", "desc"));
  if (opts?.limit) constraints.push(limitFn(opts.limit));

  const q = query(
    collection(appFirebase.db, "users", userId, "meals"),
    ...constraints
  );
  return onSnapshot(
    q,
    (snap) => onMeals(snap.docs.map(mealFromDoc)),
    (e) => onError(e instanceof Error ? e : new Error(String(e)))
  );
}

export async function saveMeal(
  userId: string,
  mealData: Omit<Meal, "id" | "createdAt">,
  opts?: { createdAt?: Date }
): Promise<string> {
  const mealsRef = collection(appFirebase.db, "users", userId, "meals");
  const clean = Object.fromEntries(
    Object.entries({
      ...mealData,
      imageUrl: mealData.imageUrl ?? null,
      isPlanned: mealData.isPlanned ?? false,
      createdAt: opts?.createdAt
        ? Timestamp.fromDate(opts.createdAt)
        : Timestamp.now(),
    }).filter(([, v]) => v !== undefined)
  );
  const ref = await addDoc(mealsRef, clean);
  return ref.id;
}

export async function deleteMeal(userId: string, mealId: string): Promise<void> {
  await deleteDoc(doc(appFirebase.db, "users", userId, "meals", mealId));
}

export async function updateMealImage(
  userId: string,
  mealId: string,
  imageUrl: string
): Promise<void> {
  await updateDoc(doc(appFirebase.db, "users", userId, "meals", mealId), {
    imageUrl,
  });
}
