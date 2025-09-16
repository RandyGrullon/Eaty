import {
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  Timestamp,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Meal, UserProfile } from "@/types/meal";

export async function saveMeal(
  userId: string,
  mealData: Omit<Meal, "id" | "createdAt">
): Promise<string> {
  try {
    const mealsRef = collection(db, "users", userId, "meals");
    const docRef = await addDoc(mealsRef, {
      ...mealData,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving meal:", error);
    throw new Error("Error al guardar la comida");
  }
}

export async function getUserMeals(userId: string): Promise<Meal[]> {
  try {
    const mealsRef = collection(db, "users", userId, "meals");
    const q = query(mealsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
      } as Meal;
    });
  } catch (error) {
    console.error("Error fetching meals:", error);
    throw new Error("Error al cargar el historial");
  }
}

export async function getTodayStats(
  userId: string
): Promise<{ mealsCount: number; totalCalories: number }> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const mealsRef = collection(db, "users", userId, "meals");
    const q = query(mealsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    let mealsCount = 0;
    let totalCalories = 0;

    querySnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const mealDate = data.createdAt.toDate();

      if (mealDate >= today && mealDate < tomorrow) {
        mealsCount++;
        totalCalories += data.calories || 0;
      }
    });

    return { mealsCount, totalCalories };
  } catch (error) {
    console.error("Error fetching today stats:", error);
    return { mealsCount: 0, totalCalories: 0 };
  }
}

export async function getMealsGroupedByDate(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ [key: string]: Meal[] }> {
  try {
    const mealsRef = collection(db, "users", userId, "meals");
    const q = query(mealsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const groups: { [key: string]: Meal[] } = {};

    querySnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const mealDate = data.createdAt.toDate();

      // Filter by date range if provided
      if (startDate && mealDate < startDate) return;
      if (endDate && mealDate >= endDate) return;

      const dateKey = mealDate.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push({
        id: doc.id,
        ...data,
        createdAt: mealDate,
      } as Meal);
    });

    return groups;
  } catch (error) {
    console.error("Error fetching meals grouped by date:", error);
    throw new Error("Error al cargar las comidas agrupadas");
  }
}

export async function getMonthlyStats(
  userId: string,
  year: number,
  month: number
): Promise<{
  totalMeals: number;
  totalCalories: number;
  averageCalories: number;
  daysWithMeals: number;
}> {
  try {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    const mealsRef = collection(db, "users", userId, "meals");
    const q = query(mealsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    let totalMeals = 0;
    let totalCalories = 0;
    const daysWithMeals = new Set<string>();

    querySnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const mealDate = data.createdAt.toDate();

      if (mealDate >= startDate && mealDate < endDate) {
        totalMeals++;
        totalCalories += data.calories || 0;
        daysWithMeals.add(mealDate.toDateString());
      }
    });

    const averageCalories =
      totalMeals > 0 ? Math.round(totalCalories / totalMeals) : 0;

    return {
      totalMeals,
      totalCalories,
      averageCalories,
      daysWithMeals: daysWithMeals.size,
    };
  } catch (error) {
    console.error("Error fetching monthly stats:", error);
    return {
      totalMeals: 0,
      totalCalories: 0,
      averageCalories: 0,
      daysWithMeals: 0,
    };
  }
}

export async function saveUserProfile(
  userId: string,
  profileData: Omit<UserProfile, "uid" | "createdAt" | "updatedAt">
): Promise<void> {
  try {
    const userProfileRef = doc(db, "users", userId, "profile", "main");
    const now = Timestamp.now();

    await setDoc(userProfileRef, {
      ...profileData,
      uid: userId,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    console.error("Error saving user profile:", error);
    throw new Error("Error al guardar el perfil del usuario");
  }
}

export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  try {
    const userProfileRef = doc(db, "users", userId, "profile", "main");
    const docSnap = await getDoc(userProfileRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as UserProfile;
    }

    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw new Error("Error al cargar el perfil del usuario");
  }
}

export async function updateUserProfile(
  userId: string,
  profileData: Partial<Omit<UserProfile, "uid" | "createdAt" | "updatedAt">>
): Promise<void> {
  try {
    const userProfileRef = doc(db, "users", userId, "profile", "main");
    const now = Timestamp.now();

    await setDoc(
      userProfileRef,
      {
        ...profileData,
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw new Error("Error al actualizar el perfil del usuario");
  }
}
