import {
  collection,
  query,
  orderBy,
  where,
  limit as limitFn,
  getDocs,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore";
import { appFirebase } from "./firebase";
import type { Meal } from "@/types/meal";

const getDb = () => appFirebase.db;

/**
 * Construye un `Meal` a partir de un documento de Firestore de forma null-safe.
 * Antes se hacía `data.createdAt.toDate()` directo, que lanzaba si el campo
 * faltaba o no era un Timestamp. Aquí degradamos a `new Date(0)` en su lugar.
 */
export function mealFromDoc(
  doc: QueryDocumentSnapshot<DocumentData>
): Meal {
  const data = doc.data();
  const rawCreatedAt = data.createdAt;
  const createdAt =
    rawCreatedAt instanceof Timestamp
      ? rawCreatedAt.toDate()
      : rawCreatedAt instanceof Date
      ? rawCreatedAt
      : new Date(0);

  return {
    id: doc.id,
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

/**
 * Consulta las comidas del usuario acotando por rango de fecha en el servidor
 * (en vez de descargar toda la colección y filtrar en cliente).
 *
 * @param start  inclusive (>=). Si se omite, sin cota inferior.
 * @param end    exclusivo (<). Si se omite, sin cota superior.
 * @param limitN límite opcional de documentos.
 */
export async function queryMealsInRange(
  userId: string,
  start?: Date,
  end?: Date,
  limitN?: number
): Promise<Meal[]> {
  const mealsRef = collection(getDb(), "users", userId, "meals");
  const constraints: QueryConstraint[] = [];

  if (start) {
    constraints.push(where("createdAt", ">=", Timestamp.fromDate(start)));
  }
  if (end) {
    constraints.push(where("createdAt", "<", Timestamp.fromDate(end)));
  }
  constraints.push(orderBy("createdAt", "desc"));
  if (limitN) {
    constraints.push(limitFn(limitN));
  }

  const snapshot = await getDocs(query(mealsRef, ...constraints));
  return snapshot.docs.map(mealFromDoc);
}
