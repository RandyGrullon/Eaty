import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { setSubscriptionState } from "@/lib/subscription-server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Webhook de RevenueCat: sincroniza el estado premium a Firestore para que
 * `enforceDailyQuota` aplique límites free/premium sin llamar a RevenueCat
 * en cada request.
 *
 * Configuración (RevenueCat > Project > Integrations > Webhooks):
 * - URL: https://<tu-dominio>/api/revenuecat/webhook
 * - Authorization header: el mismo valor que REVENUECAT_WEBHOOK_AUTH en .env.
 * - App user ID = uid de Firebase (la app llama Purchases.configure con el uid).
 */
const eventSchema = z.object({
  event: z.object({
    type: z.string(),
    app_user_id: z.string().min(1),
    product_id: z.string().nullish(),
    entitlement_ids: z.array(z.string()).nullish(),
    expiration_at_ms: z.number().nullish(),
    store: z.string().nullish(),
    environment: z.string().nullish(),
  }),
});

/** Eventos que activan premium; el resto se decide por expiración. */
const ACTIVATING_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "NON_RENEWING_PURCHASE",
  "SUBSCRIPTION_EXTENDED",
]);

const DEACTIVATING_EVENTS = new Set(["EXPIRATION", "SUBSCRIPTION_PAUSED"]);

export async function POST(req: Request) {
  const secret = process.env.REVENUECAT_WEBHOOK_AUTH?.trim();
  if (!secret) {
    logger.error("revenuecat-webhook", "Falta REVENUECAT_WEBHOOK_AUTH en .env");
    return NextResponse.json({ error: "Webhook no configurado." }, { status: 503 });
  }
  const auth = req.headers.get("authorization")?.trim();
  if (auth !== secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let parsed: z.infer<typeof eventSchema>;
  try {
    parsed = eventSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const ev = parsed.event;

  // Ids anónimos de RevenueCat ($RCAnonymousID:...) no mapean a un uid de
  // Firebase: se ignoran (la app siempre configura el uid como app_user_id).
  if (ev.app_user_id.startsWith("$RCAnonymousID:")) {
    return NextResponse.json({ ok: true, skipped: "anonymous" });
  }

  const expiresAtMs = ev.expiration_at_ms ?? null;
  const stillActive = expiresAtMs !== null && expiresAtMs > Date.now();
  const isPremium = DEACTIVATING_EVENTS.has(ev.type)
    ? false
    : ACTIVATING_EVENTS.has(ev.type)
      ? true
      : // CANCELLATION (auto-renew off), BILLING_ISSUE, TRANSFER, etc.:
        // premium mientras la expiración siga en el futuro.
        stillActive;

  try {
    await setSubscriptionState(ev.app_user_id, {
      isPremium,
      expiresAt: expiresAtMs !== null ? Timestamp.fromMillis(expiresAtMs) : null,
      productId: ev.product_id ?? null,
      store: ev.store ?? null,
      environment: ev.environment ?? null,
      lastEventType: ev.type,
    });
  } catch (e) {
    logger.error("revenuecat-webhook", e);
    // 500 para que RevenueCat reintente.
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
