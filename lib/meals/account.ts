import {
  collection,
  doc,
  getDocs,
  writeBatch,
  type DocumentReference,
} from "firebase/firestore";
import { deleteObject, listAll, ref, type StorageReference } from "firebase/storage";
import type { User } from "firebase/auth";
import { appFirebase } from "@/lib/firebase";
import { logger } from "@/lib/logger";
import { chunk } from "@/lib/chunk";
import { getDb } from "./db";

/** Límite de operaciones por batch (Firestore permite 500; dejamos margen). */
const MAX_BATCH_OPS = 450;

/** Subcolecciones de `users/{uid}` que el cliente puede borrar (las reglas impiden usage/billing). */
const USER_SUBCOLLECTIONS = ["meals", "diets", "workouts", "dailyStats", "profile"] as const;

/**
 * Elimina la cuenta completa. Usa el servidor (`/api/account/delete`), que borra
 * Firestore (incluido uso/suscripción), las fotos en Storage y el usuario de Auth.
 * Solo si el servidor no tiene Firebase Admin configurado (503) cae al borrado
 * desde el cliente, que no puede eliminar el usuario de Auth ni `usage`/`billing`.
 */
export async function deleteUserAccount(user: User): Promise<void> {
  const idToken = await user.getIdToken();
  let res: Response;
  try {
    res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
      credentials: "include",
    });
  } catch (e) {
    logger.error("deleteUserAccount: red", e);
    throw new Error("No se pudo contactar con el servidor para eliminar la cuenta.");
  }

  if (res.ok) return;

  if (res.status === 503) {
    logger.warn(
      "deleteUserAccount: Admin no configurado; borrado desde el cliente (la cuenta de Auth no se elimina)."
    );
    await deleteUserAccountData(user.uid);
    return;
  }

  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  throw new Error(body?.error || "No se pudo eliminar la cuenta.");
}

/**
 * Fallback cliente: borra las subcolecciones del usuario en batches de <=450
 * operaciones y, best effort, sus fotos en Storage.
 */
export async function deleteUserAccountData(userId: string): Promise<void> {
  try {
    const db = getDb();
    const refs: DocumentReference[] = [];
    for (const name of USER_SUBCOLLECTIONS) {
      const snap = await getDocs(collection(db, "users", userId, name));
      for (const d of snap.docs) refs.push(d.ref);
    }
    // El perfil puede no aparecer en el listado si nunca se creó; se incluye siempre.
    const profileRef = doc(db, "users", userId, "profile", "main");
    if (!refs.some((r) => r.path === profileRef.path)) refs.push(profileRef);

    for (const group of chunk(refs, MAX_BATCH_OPS)) {
      const batch = writeBatch(db);
      for (const r of group) batch.delete(r);
      await batch.commit();
    }
  } catch (error) {
    logger.error("Error deleting user data", error);
    throw new Error("No se pudieron eliminar todos los datos");
  }

  // Las reglas de Storage solo dan acceso a estas carpetas del usuario.
  for (const folder of ["meals", "gym"]) {
    try {
      await deleteStorageFolder(
        ref(appFirebase.storage, `users/${userId}/${folder}`)
      );
    } catch (e) {
      logger.error(`deleteUserAccountData: fotos en Storage (${folder})`, e);
    }
  }
}

async function deleteStorageFolder(folder: StorageReference): Promise<void> {
  const { items, prefixes } = await listAll(folder);
  await Promise.all(items.map((item) => deleteObject(item)));
  for (const p of prefixes) await deleteStorageFolder(p);
}
