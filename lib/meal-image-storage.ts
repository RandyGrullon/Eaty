import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { appFirebase } from "@/lib/firebase";
import { logger } from "@/lib/logger";

/**
 * Sube la foto del análisis a Storage y devuelve la URL pública de descarga.
 * Ruta: `users/{userId}/meals/{mealId}/photo.{ext}` (reglas: solo el propio uid).
 */
export async function uploadUserMealImage(
  userId: string,
  mealId: string,
  file: File
): Promise<string> {
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `users/${userId}/meals/${mealId}/photo.${ext}`;
  const storageRef = ref(appFirebase.storage, path);
  try {
    await uploadBytes(storageRef, file, {
      contentType: file.type || "image/jpeg",
    });
    return await getDownloadURL(storageRef);
  } catch (e) {
    logger.error("uploadUserMealImage", e);
    throw e;
  }
}
