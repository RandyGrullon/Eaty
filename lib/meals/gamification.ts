import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { logger } from "@/lib/logger";
import { getDb } from "./db";
import { getUserProfile } from "./profile";
import { getUserMeals } from "./meals";
import { getTodayStats } from "./stats";

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
        const diffDays = Math.floor(
          (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
          currentStreak += 1;
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
        // Si diffDays === 0, ya registró hoy, no incrementamos.
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
    logger.error("Error updating streak", error);
    return 0;
  }
}

/** Incrementa o decrementa los vasos de agua del día actual. */
export async function updateWaterGlasses(
  userId: string,
  delta: number
): Promise<number> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = today.toISOString().split("T")[0];
    const statsRef = doc(getDb(), "users", userId, "dailyStats", dateKey);

    const statsSnap = await getDoc(statsRef);
    let waterGlasses = statsSnap.exists()
      ? statsSnap.data().waterGlasses || 0
      : 0;
    waterGlasses = Math.max(0, waterGlasses + delta);

    await setDoc(
      statsRef,
      {
        waterGlasses,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    return waterGlasses;
  } catch (error) {
    logger.error("Error updating water glasses", error);
    throw error;
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
export async function awardPoints(
  userId: string,
  amount: number
): Promise<{ newPoints: number; leveledUp: boolean }> {
  try {
    const profileRef = doc(getDb(), "users", userId, "profile", "main");
    const docSnap = await getDoc(profileRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const currentPoints = data.points || 0;
      const currentLevel = data.level || 1;
      const newPoints = currentPoints + amount;

      // Fórmula simple de nivel: cada nivel requiere 1000 puntos * nivel.
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
    logger.error("Error awarding points", error);
    return { newPoints: 0, leveledUp: false };
  }
}
