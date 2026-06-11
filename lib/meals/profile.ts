import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { logger } from "@/lib/logger";
import { normalizeBirthDateFromFirestore } from "@/lib/age-from-birthdate";
import type { UserProfile } from "@/types/meal";
import { getDb } from "./db";

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
    logger.error("Error saving user profile", error);
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
    logger.error("Error fetching user profile", error);
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
    logger.error("Error updating user profile", error);
    throw new Error("Error al actualizar el perfil del usuario");
  }
}
