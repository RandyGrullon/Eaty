export type ClipboardPasteResult =
  | { kind: "image"; file: File }
  | { kind: "text"; text: string }
  | { kind: "empty" };

/**
 * Lee el portapapeles: prioriza imagen (Clipboard API) y si no hay, texto.
 * `clipboard.read()` puede pedir permiso al usuario en el navegador.
 */
export async function pasteImageOrTextFromClipboard(): Promise<ClipboardPasteResult> {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    throw new Error("El portapapeles no está disponible en este entorno.");
  }

  try {
    if (navigator.clipboard.read) {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const sub = type.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
            const mime = blob.type || type;
            const file = new File([blob], `pegado.${sub}`, { type: mime });
            return { kind: "image", file };
          }
        }
      }
    }
  } catch {
    // Sin permiso o sin imagen: intentar texto
  }

  try {
    const text = (await navigator.clipboard.readText()).trim();
    if (text.length > 0) {
      return { kind: "text", text };
    }
  } catch {
    throw new Error("No se pudo leer el portapapeles.");
  }

  return { kind: "empty" };
}
