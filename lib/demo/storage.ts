/**
 * Sustituto de `firebase/storage` para el modo demo: la "subida" devuelve
 * una data URL comprimida en el propio navegador.
 */
export type FirebaseStorage = { __demo: true };
export type StorageReference = { path: string };

const uploads = new Map<string, string>();

export function getStorage(): FirebaseStorage {
  return { __demo: true };
}

export function ref(_s: FirebaseStorage, path: string): StorageReference {
  return { path };
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Reduce la imagen para no llenar localStorage en el demo. */
async function shrink(blob: Blob): Promise<string> {
  const url = await blobToDataUrl(blob);
  if (typeof document === "undefined") return url;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const max = 480;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

export async function uploadBytes(r: StorageReference, data: Blob) {
  uploads.set(r.path, await shrink(data));
  return { ref: r };
}

export async function getDownloadURL(r: StorageReference): Promise<string> {
  const url = uploads.get(r.path);
  if (!url) throw new Error("storage/object-not-found");
  return url;
}

export async function deleteObject(r: StorageReference): Promise<void> {
  uploads.delete(r.path);
}

export async function listAll(_r: StorageReference) {
  return { items: [] as StorageReference[], prefixes: [] as StorageReference[] };
}
