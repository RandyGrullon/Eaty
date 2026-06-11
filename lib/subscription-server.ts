import { Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";

/**
 * Estado de suscripción sincronizado por el webhook de RevenueCat en
 * `users/{uid}/billing/subscription`. Solo lo escribe el servidor
 * (las reglas de Firestore deniegan write de cliente en `billing`).
 */
export type SubscriptionState = {
  isPremium: boolean;
  /** null = sin expiración conocida (ej. compra lifetime). */
  expiresAt: Timestamp | null;
  productId: string | null;
  store: string | null;
  environment: string | null;
  lastEventType: string | null;
  updatedAt: Timestamp;
};

export function subscriptionDocPath(uid: string): string {
  return `users/${uid}/billing/subscription`;
}

export async function setSubscriptionState(
  uid: string,
  state: Omit<SubscriptionState, "updatedAt">
): Promise<void> {
  const db = getAdminFirestore();
  await db.doc(subscriptionDocPath(uid)).set(
    { ...state, updatedAt: Timestamp.now() },
    { merge: true }
  );
}

/**
 * `true` si el usuario tiene premium vigente. Tolerante a datos ausentes:
 * sin documento o malformado => free.
 */
export async function isPremiumUser(uid: string): Promise<boolean> {
  const db = getAdminFirestore();
  const snap = await db.doc(subscriptionDocPath(uid)).get();
  if (!snap.exists) return false;
  const d = snap.data();
  if (!d || d.isPremium !== true) return false;
  const expiresAt = d.expiresAt;
  if (expiresAt instanceof Timestamp) {
    // Margen de 1h por relojes/retrasos de webhook en renovaciones.
    return expiresAt.toMillis() + 60 * 60 * 1000 > Date.now();
  }
  return true;
}
