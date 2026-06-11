import {
  doc,
  onSnapshot,
  setDoc,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { appFirebase } from "@/lib/firebase";
import { normalizeBirthDateFromFirestore } from "@/lib/age-from-birthdate";
import type { UserProfile } from "@/types/meal";

/** Mismo documento `users/{uid}/profile/main` que la web. */
function profileRef(userId: string) {
  return doc(appFirebase.db, "users", userId, "profile", "main");
}

function profileFromData(userId: string, data: DocumentData): UserProfile {
  const { birthDate: rawBirth, createdAt, updatedAt, ...rest } = data;
  return {
    ...rest,
    uid: userId,
    birthDate: normalizeBirthDateFromFirestore(rawBirth),
    createdAt:
      createdAt instanceof Timestamp ? createdAt.toDate() : new Date(0),
    updatedAt:
      updatedAt instanceof Timestamp ? updatedAt.toDate() : new Date(0),
  } as UserProfile;
}

export function listenToProfile(
  userId: string,
  onProfile: (profile: UserProfile | null) => void,
  onError: (e: Error) => void
): () => void {
  return onSnapshot(
    profileRef(userId),
    (snap) => {
      onProfile(snap.exists() ? profileFromData(userId, snap.data()) : null);
    },
    (e) => onError(e instanceof Error ? e : new Error(String(e)))
  );
}

export async function updateUserProfile(
  userId: string,
  profileData: Partial<Omit<UserProfile, "uid" | "createdAt" | "updatedAt">>
): Promise<void> {
  const clean = Object.fromEntries(
    Object.entries(profileData).filter(([, v]) => v !== undefined)
  );
  await setDoc(
    profileRef(userId),
    { ...clean, uid: userId, updatedAt: Timestamp.now() },
    { merge: true }
  );
}
