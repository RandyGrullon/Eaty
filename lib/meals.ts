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
  updateDoc,
  arrayUnion,
  increment,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import { appFirebase } from "./firebase";
import { uploadUserMealImage } from "@/lib/meal-image-storage";
import { logger } from "@/lib/logger";

const getDb = () => appFirebase.db;
import { normalizeBirthDateFromFirestore } from "./age-from-birthdate";
import type { Meal, UserProfile } from "@/types/meal";

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
    console.error("Error updating meal:", error);
    throw new Error("Error al actualizar la comida");
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
  options?: SaveMealOptions
): Promise<SaveMealResult> {
  try {
    const mealsRef = collection(getDb(), "users", userId, "meals");
    const docRef = await addDoc(mealsRef, {
      ...mealData,
      imageUrl: mealData.imageUrl ?? null,
      createdAt: Timestamp.now(),
    });
    let imageStored = false;
    if (options?.imageFile) {
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
    }
    return { mealId: docRef.id, imageStored };
  } catch (error) {
    console.error("Error saving meal:", error);
    throw new Error("Error al guardar la comida");
  }
}

export async function getUserMeals(userId: string): Promise<Meal[]> {
  try {
    const mealsRef = collection(getDb(), "users", userId, "meals");
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
): Promise<{ 
  mealsCount: number; 
  totalCalories: number;
  macros: { protein: number; carbs: number; fat: number };
  waterGlasses: number;
}> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const mealsRef = collection(getDb(), "users", userId, "meals");
    const q = query(mealsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    let mealsCount = 0;
    let totalCalories = 0;
    const macros = { protein: 0, carbs: 0, fat: 0 };

    querySnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const mealDate = data.createdAt.toDate();

      if (mealDate >= today && mealDate < tomorrow) {
        mealsCount++;
        totalCalories += data.calories || 0;
        if (data.macros) {
          macros.protein += data.macros.protein || 0;
          macros.carbs += data.macros.carbs || 0;
          macros.fat += data.macros.fat || 0;
        }
      }
    });

    // Obtener hidratación del documento de stats diario
    const dateKey = today.toISOString().split("T")[0];
    const statsRef = doc(getDb(), "users", userId, "dailyStats", dateKey);
    const statsSnap = await getDoc(statsRef);
    const waterGlasses = statsSnap.exists() ? statsSnap.data().waterGlasses || 0 : 0;

    return { mealsCount, totalCalories, macros, waterGlasses };
  } catch (error) {
    console.error("Error fetching today stats:", error);
    return { 
      mealsCount: 0, 
      totalCalories: 0, 
      macros: { protein: 0, carbs: 0, fat: 0 },
      waterGlasses: 0 
    };
  }
}

/** Actualiza la racha del usuario basada en la última actividad. */
export async function updateStreak(userId: string): Promise<number> {
  try {
    const userProfileRef = doc(getDb(), "users", userId, "profile", "main");
    const docSnap = await getDoc(userProfileRef);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const lastActive = data.lastActiveDate?.toDate();
      let currentStreak = data.currentStreak || 0;

      if (!lastActive) {
        currentStreak = 1;
      } else {
        lastActive.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          currentStreak += 1;
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
        // Si diffDays === 0, ya registró hoy, no incrementamos
      }

      await updateDoc(userProfileRef, {
        currentStreak,
        lastActiveDate: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return currentStreak;
    }
    return 0;
  } catch (error) {
    console.error("Error updating streak:", error);
    return 0;
  }
}

/** Incrementa o decrementa los vasos de agua del día actual. */
export async function updateWaterGlasses(userId: string, delta: number): Promise<number> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = today.toISOString().split("T")[0];
    const statsRef = doc(getDb(), "users", userId, "dailyStats", dateKey);
    
    const statsSnap = await getDoc(statsRef);
    let waterGlasses = statsSnap.exists() ? statsSnap.data().waterGlasses || 0 : 0;
    waterGlasses = Math.max(0, waterGlasses + delta);

    await setDoc(statsRef, { 
      waterGlasses,
      updatedAt: Timestamp.now()
    }, { merge: true });

    return waterGlasses;
  } catch (error) {
    console.error("Error updating water glasses:", error);
    throw error;
  }
}

export async function getMealsGroupedByDate(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ [key: string]: Meal[] }> {
  try {
    const mealsRef = collection(getDb(), "users", userId, "meals");
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

    const mealsRef = collection(getDb(), "users", userId, "meals");
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
    const userProfileRef = doc(getDb(), "users", userId, "profile", "main");
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
    const userProfileRef = doc(getDb(), "users", userId, "profile", "main");
    const docSnap = await getDoc(userProfileRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const { birthDate: rawBirth, createdAt, updatedAt, ...rest } = data;
      return {
        ...rest,
        birthDate: normalizeBirthDateFromFirestore(rawBirth),
        createdAt: createdAt.toDate(),
        updatedAt: updatedAt.toDate(),
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
    const userProfileRef = doc(getDb(), "users", userId, "profile", "main");
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

export async function getRecentActivities(
  userId: string,
  limit: number = 5
): Promise<Meal[]> {
  try {
    const mealsRef = collection(getDb(), "users", userId, "meals");
    const q = query(mealsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.slice(0, limit).map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
      } as Meal;
    });
  } catch (error) {
    console.error("Error fetching recent activities:", error);
    return [];
  }
}

export async function getWeeklyProgress(userId: string): Promise<{
  currentWeek: {
    totalMeals: number;
    totalCalories: number;
    averageCalories: number;
    daysActive: number;
  };
  previousWeek: {
    totalMeals: number;
    totalCalories: number;
    averageCalories: number;
    daysActive: number;
  };
  progress: {
    mealsChange: number;
    caloriesChange: number;
    daysChange: number;
  };
}> {
  try {
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
    currentWeekStart.setHours(0, 0, 0, 0);

    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 7);

    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(currentWeekStart.getDate() - 7);

    const previousWeekEnd = new Date(currentWeekStart);

    const mealsRef = collection(getDb(), "users", userId, "meals");
    const q = query(mealsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    let currentWeekMeals = 0;
    let currentWeekCalories = 0;
    let previousWeekMeals = 0;
    let previousWeekCalories = 0;
    const currentWeekDays = new Set<string>();
    const previousWeekDays = new Set<string>();

    querySnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const mealDate = data.createdAt.toDate();

      if (mealDate >= currentWeekStart && mealDate < currentWeekEnd) {
        currentWeekMeals++;
        currentWeekCalories += data.calories || 0;
        currentWeekDays.add(mealDate.toDateString());
      } else if (mealDate >= previousWeekStart && mealDate < previousWeekEnd) {
        previousWeekMeals++;
        previousWeekCalories += data.calories || 0;
        previousWeekDays.add(mealDate.toDateString());
      }
    });

    const currentWeek = {
      totalMeals: currentWeekMeals,
      totalCalories: currentWeekCalories,
      averageCalories:
        currentWeekMeals > 0
          ? Math.round(currentWeekCalories / currentWeekMeals)
          : 0,
      daysActive: currentWeekDays.size,
    };

    const previousWeek = {
      totalMeals: previousWeekMeals,
      totalCalories: previousWeekCalories,
      averageCalories:
        previousWeekMeals > 0
          ? Math.round(previousWeekCalories / previousWeekMeals)
          : 0,
      daysActive: previousWeekDays.size,
    };

    const progress = {
      mealsChange:
        previousWeek.totalMeals > 0
          ? Math.round(
              ((currentWeek.totalMeals - previousWeek.totalMeals) /
                previousWeek.totalMeals) *
                100
            )
          : currentWeek.totalMeals > 0
          ? 100
          : 0,
      caloriesChange:
        previousWeek.totalCalories > 0
          ? Math.round(
              ((currentWeek.totalCalories - previousWeek.totalCalories) /
                previousWeek.totalCalories) *
                100
            )
          : currentWeek.totalCalories > 0
          ? 100
          : 0,
      daysChange:
        previousWeek.daysActive > 0
          ? Math.round(
              ((currentWeek.daysActive - previousWeek.daysActive) /
                previousWeek.daysActive) *
                100
            )
          : currentWeek.daysActive > 0
          ? 100
          : 0,
    };

    return {
      currentWeek,
      previousWeek,
      progress,
    };
  } catch (error) {
    console.error("Error fetching weekly progress:", error);
    return {
      currentWeek: {
        totalMeals: 0,
        totalCalories: 0,
        averageCalories: 0,
        daysActive: 0,
      },
      previousWeek: {
        totalMeals: 0,
        totalCalories: 0,
        averageCalories: 0,
        daysActive: 0,
      },
      progress: { mealsChange: 0, caloriesChange: 0, daysChange: 0 },
    };
  }
}

/** Evalúa y otorga logros al usuario basados en su actividad. */
export async function evaluateAchievements(userId: string): Promise<string[]> {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) return [];

    const meals = await getUserMeals(userId);
    const achievements: string[] = profile.achievements || [];
    const newAchievements: string[] = [];

    const checkAndAdd = (id: string) => {
      if (!achievements.includes(id)) {
        newAchievements.push(id);
      }
    };

    // 1. Número de comidas
    if (meals.length >= 1) checkAndAdd("first_meal");
    if (meals.length >= 10) checkAndAdd("explorer");
    if (meals.length >= 50) checkAndAdd("nutrition_master");

    // 2. Rachas
    if ((profile.currentStreak || 0) >= 3) checkAndAdd("streak_3");
    if ((profile.currentStreak || 0) >= 7) checkAndAdd("streak_7");

    // 3. Hidratación (necesitamos los stats de hoy)
    const todayStats = await getTodayStats(userId);
    if (todayStats.waterGlasses >= 8) checkAndAdd("hydrated_hero");

    if (newAchievements.length > 0) {
      const profileRef = doc(getDb(), "users", userId, "profile", "main");
      await updateDoc(profileRef, {
        achievements: arrayUnion(...newAchievements),
        updatedAt: Timestamp.now(),
      });
    }

    return newAchievements;
  } catch (error) {
    logger.error("Error evaluating achievements", error);
    return [];
  }
}

/** Otorga puntos al usuario y maneja subidas de nivel. */
export async function awardPoints(userId: string, amount: number): Promise<{ newPoints: number; leveledUp: boolean }> {
  try {
    const profileRef = doc(getDb(), "users", userId, "profile", "main");
    const docSnap = await getDoc(profileRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const currentPoints = data.points || 0;
      const currentLevel = data.level || 1;
      const newPoints = currentPoints + amount;
      
      // Fórmula simple de nivel: cada nivel requiere 1000 puntos * nivel
      const pointsToNextLevel = currentLevel * 1000;
      let leveledUp = false;
      let newLevel = currentLevel;

      if (newPoints >= pointsToNextLevel) {
        newLevel += 1;
        leveledUp = true;
      }

      await updateDoc(profileRef, {
        points: newPoints,
        level: newLevel,
        updatedAt: Timestamp.now(),
      });

      return { newPoints, leveledUp };
    }
    return { newPoints: 0, leveledUp: false };
  } catch (error) {
    console.error("Error awarding points:", error);
    return { newPoints: 0, leveledUp: false };
  }
}

/** Elimina todos los datos del usuario (comidas, perfil, stats). */
export async function deleteUserAccountData(userId: string): Promise<void> {
  try {
    const db = getDb();
    const batch = writeBatch(db);

    // 1. Eliminar todas las comidas
    const mealsRef = collection(db, "users", userId, "meals");
    const mealsSnap = await getDocs(mealsRef);
    mealsSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 2. Eliminar todos los stats diarios
    const statsRef = collection(db, "users", userId, "dailyStats");
    const statsSnap = await getDocs(statsRef);
    statsSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 3. Eliminar el perfil
    const profileRef = doc(db, "users", userId, "profile", "main");
    batch.delete(profileRef);

    await batch.commit();
  } catch (error) {
    console.error("Error deleting user data:", error);
    throw new Error("No se pudieron eliminar todos los datos");
  }
}
