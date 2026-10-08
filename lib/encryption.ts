"use client";

/**
 * SOLO LECTURA DE DATOS ANTIGUOS.
 *
 * Versiones anteriores guardaban peso/altura "cifrados" en el cliente (AES-GCM con
 * una clave derivada del UID). Eso no aportaba seguridad real (el UID no es secreto)
 * y rompía los cálculos de calorías, así que ahora se guardan como números.
 * Este módulo solo descifra los valores antiguos que aún queden en Firestore.
 */

const ALGORITHM = "AES-GCM";

async function getLegacyKey(userId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(userId),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("eaty-salt-2026"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: 256 },
    false,
    ["decrypt"]
  );
}

/**
 * Descifra un valor antiguo. Si no está cifrado o falla, devuelve el texto tal cual.
 */
export async function decryptLegacyData(
  cipherText: string,
  userId: string
): Promise<string> {
  if (!cipherText || cipherText.length < 16) return cipherText;
  try {
    const key = await getLegacyKey(userId);
    const binary = atob(cipherText);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const iv = bytes.slice(0, 12);
    const data = bytes.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    return cipherText;
  }
}
