import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { appFirebase } from "@/lib/firebase";

/**
 * Sube la foto del análisis a Storage y devuelve la URL pública.
 * Misma ruta que la web: `users/{userId}/meals/{mealId}/photo.jpg`
 * (las reglas de Storage ya permiten escribir solo al propio uid).
 */
export async function uploadUserMealImage(
  userId: string,
  mealId: string,
  localUri: string
): Promise<string> {
  const blob = await (await fetch(localUri)).blob();
  const path = `users/${userId}/meals/${mealId}/photo.jpg`;
  const storageRef = ref(appFirebase.storage, path);
  await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  return await getDownloadURL(storageRef);
}
