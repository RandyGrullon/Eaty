"use client";

/**
 * Utilidades básicas para cifrado en el cliente (AES-GCM).
 * El objetivo es proteger campos sensibles en Firestore.
 * La clave se deriva del UID del usuario (en una app real sería una contraseña o un pin).
 */

const ALGORITHM = "AES-GCM";

async function getKey(userId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(userId),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("eaty-salt-2026"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(text: string, userId: string): Promise<string> {
  if (!text) return "";
  try {
    const key = await getKey(userId);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encrypted = await window.crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      enc.encode(text)
    );

    const exported = new Uint8Array(iv.length + encrypted.byteLength);
    exported.set(iv, 0);
    exported.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...exported));
  } catch (e) {
    console.error("Encryption error", e);
    return text;
  }
}

export async function decryptData(cipherText: string, userId: string): Promise<string> {
  if (!cipherText || cipherText.length < 16) return cipherText;
  try {
    const key = await getKey(userId);
    const binary = atob(cipherText);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const iv = bytes.slice(0, 12);
    const data = bytes.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.warn("Decryption failed - possibly not encrypted", e);
    return cipherText;
  }
}
