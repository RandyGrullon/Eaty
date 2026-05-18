import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { appFirebase } from "@/lib/firebase";
import { logger } from "@/lib/logger";
import imageCompression from "browser-image-compression";

/**
 * Sube la foto del análisis a Storage y devuelve la URL pública de descarga.
 * Comprime la imagen en el cliente antes de la subida.
 * Ruta: `users/{userId}/meals/{mealId}/photo.{ext}` (reglas: solo el propio uid).
 */
export async function uploadUserMealImage(
  userId: string,
  mealId: string,
  file: File
): Promise<string> {
  let uploadFile: File | Blob = file;

  // Comprimir si es una imagen y estamos en el cliente
  if (typeof window !== "undefined" && file.type.startsWith("image/")) {
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };
      uploadFile = await imageCompression(file, options);
    } catch (e) {
      logger.error("uploadUserMealImage (compression error)", e);
      // Si falla la compresión, procedemos con el original
    }
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `users/${userId}/meals/${mealId}/photo.${ext}`;
  const storageRef = ref(appFirebase.storage, path);
  try {
    await uploadBytes(storageRef, uploadFile, {
      contentType: file.type || "image/jpeg",
    });
    return await getDownloadURL(storageRef);
  } catch (e) {
    logger.error("uploadUserMealImage", e);
    throw e;
  }
}
