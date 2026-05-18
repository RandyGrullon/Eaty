import JSZip from "jszip";
import { Meal, UserProfile } from "@/types/meal";
import { getUserMeals, getUserProfile } from "@/lib/meals";

export async function exportUserData(userId: string): Promise<Blob> {
  const zip = new JSZip();

  // 1. Obtener datos del perfil
  const profile = await getUserProfile(userId);
  if (profile) {
    zip.file("perfil.json", JSON.stringify(profile, null, 2));
  }

  // 2. Obtener historial de comidas
  const meals = await getUserMeals(userId);
  zip.file("comidas.json", JSON.stringify(meals, null, 2));

  // 3. Descargar fotos (esto puede ser pesado, limitamos o avisamos)
  const photosFolder = zip.folder("fotos");
  
  if (photosFolder) {
    const photoPromises = meals
      .filter((m) => m.imageUrl)
      .map(async (meal) => {
        try {
          const response = await fetch(meal.imageUrl!);
          const blob = await response.blob();
          const fileName = `${meal.id}.jpg`;
          photosFolder.file(fileName, blob);
        } catch (e) {
          console.error(`Error descargando foto ${meal.id}:`, e);
        }
      });

    await Promise.all(photoPromises);
  }

  // 4. Generar archivo ZIP
  const content = await zip.generateAsync({ type: "blob" });
  return content;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
