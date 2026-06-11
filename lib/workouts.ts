import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { appFirebase } from "@/lib/firebase";
import { logger } from "@/lib/logger";
import type { GeneratedWorkout, Workout } from "@/types/workout";

const getDb = () => appFirebase.db;

export function workoutFromDoc(
  d: QueryDocumentSnapshot<DocumentData>
): Workout {
  const data = d.data();
  const createdAt =
    data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(0);
  return {
    id: d.id,
    title: data.title ?? "Rutina",
    goal: data.goal ?? "",
    daysPerWeek:
      data.daysPerWeek ?? (Array.isArray(data.days) ? data.days.length : 1),
    level: data.level ?? "beginner",
    estimatedCaloriesPerSession: data.estimatedCaloriesPerSession,
    warmup: Array.isArray(data.warmup) ? data.warmup : [],
    days: Array.isArray(data.days) ? data.days : [],
    tips: Array.isArray(data.tips) ? data.tips : [],
    createdAt,
  };
}

export async function saveWorkout(
  userId: string,
  workout: GeneratedWorkout
): Promise<string> {
  try {
    const ref = collection(getDb(), "users", userId, "workouts");
    const clean = JSON.parse(JSON.stringify(workout));
    const docRef = await addDoc(ref, { ...clean, createdAt: Timestamp.now() });
    return docRef.id;
  } catch (e) {
    logger.error("Error saving workout", e);
    throw new Error("Error al guardar la rutina");
  }
}

export async function deleteWorkout(
  userId: string,
  workoutId: string
): Promise<void> {
  try {
    await deleteDoc(doc(getDb(), "users", userId, "workouts", workoutId));
  } catch (e) {
    logger.error("Error deleting workout", e);
    throw new Error("Error al eliminar la rutina");
  }
}
