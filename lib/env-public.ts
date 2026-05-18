import { z } from "zod";

/**
 * Esquema de validación para variables de entorno públicas (NEXT_PUBLIC_*).
 * Next.js requiere que estas variables se accedan de forma literal para ser incluidas en el cliente.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_BODYMATTER_ORIGIN: z
    .string()
    .url()
    .optional()
    .default("http://localhost:3001"),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, "Falta NEXT_PUBLIC_FIREBASE_API_KEY"),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, "Falta NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, "Falta NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1, "Falta NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1, "Falta NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, "Falta NEXT_PUBLIC_FIREBASE_APP_ID"),
});

// Validación en tiempo de carga del módulo
const envParse = publicEnvSchema.safeParse({
  NEXT_PUBLIC_BODYMATTER_ORIGIN: process.env.NEXT_PUBLIC_BODYMATTER_ORIGIN,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

if (!envParse.success) {
  const errors = envParse.error.flatten().fieldErrors;
  const missing = Object.keys(errors).join(", ");
  console.error("❌ Error de configuración (Variables de entorno públicas faltantes):", errors);
  // No lanzamos error aquí para evitar romper el build de Next.js si faltan en CI, 
  // pero los componentes que dependan de ellas fallarán con gracia.
}

export const envPublic = envParse.success 
  ? envParse.data 
  : ({} as z.infer<typeof publicEnvSchema>);

/** Origen público de Body Matter (subdominio en prod). Local: 3001. */
export function getBodyMatterPublicOrigin(): string {
  return envPublic.NEXT_PUBLIC_BODYMATTER_ORIGIN?.replace(/\/$/, "") || "http://localhost:3001";
}
