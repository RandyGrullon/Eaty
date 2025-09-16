import { collection, addDoc, query, orderBy, getDocs, Timestamp } from "firebase/firestore"
import { db } from "./firebase"
import type { Meal } from "@/types/meal"

export async function saveMeal(userId: string, mealData: Omit<Meal, "id" | "createdAt">): Promise<string> {
  try {
    const mealsRef = collection(db, "users", userId, "meals")
    const docRef = await addDoc(mealsRef, {
      ...mealData,
      createdAt: Timestamp.now(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error saving meal:", error)
    throw new Error("Error al guardar la comida")
  }
}

export async function getUserMeals(userId: string): Promise<Meal[]> {
  try {
    const mealsRef = collection(db, "users", userId, "meals")
    const q = query(mealsRef, orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
      } as Meal
    })
  } catch (error) {
    console.error("Error fetching meals:", error)
    throw new Error("Error al cargar el historial")
  }
}

export async function getTodayStats(userId: string): Promise<{ mealsCount: number; totalCalories: number }> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const mealsRef = collection(db, "users", userId, "meals")
    const q = query(mealsRef, orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)

    let mealsCount = 0
    let totalCalories = 0

    querySnapshot.docs.forEach((doc) => {
      const data = doc.data()
      const mealDate = data.createdAt.toDate()

      if (mealDate >= today && mealDate < tomorrow) {
        mealsCount++
        totalCalories += data.calories || 0
      }
    })

    return { mealsCount, totalCalories }
  } catch (error) {
    console.error("Error fetching today stats:", error)
    return { mealsCount: 0, totalCalories: 0 }
  }
}
