import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { logger } from "@/lib/logger";
import { getDb } from "./db";

/** Elimina todos los datos del usuario (comidas, perfil, stats). */
export async function deleteUserAccountData(userId: string): Promise<void> {
  try {
    const db = getDb();
    const batch = writeBatch(db);

    // 1. Eliminar todas las comidas.
    const mealsRef = collection(db, "users", userId, "meals");
    const mealsSnap = await getDocs(mealsRef);
    mealsSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 2. Eliminar todos los stats diarios.
    const statsRef = collection(db, "users", userId, "dailyStats");
    const statsSnap = await getDocs(statsRef);
    statsSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 3. Eliminar el perfil.
    const profileRef = doc(db, "users", userId, "profile", "main");
    batch.delete(profileRef);

    await batch.commit();
  } catch (error) {
    logger.error("Error deleting user data", error);
    throw new Error("No se pudieron eliminar todos los datos");
  }
}
