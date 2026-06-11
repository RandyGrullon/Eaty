import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";
import { useAuth } from "@/hooks/use-auth";

/** Entitlement configurado en RevenueCat que desbloquea todo lo premium. */
export const PREMIUM_ENTITLEMENT = "premium";

type SubscriptionContextValue = {
  /**
   * `true` con entitlement activo. El gating real de la cuota de análisis lo
   * hace el servidor (webhook RevenueCat -> Firestore); esto controla la UI.
   */
  isPremium: boolean;
  /** false en Expo Go o sin API keys: la UI esconde el paywall y trata todo como free. */
  available: boolean;
  loading: boolean;
  currentOffering: PurchasesOffering | null;
  purchase: (pkg: PurchasesPackage) => Promise<void>;
  restore: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

function rcApiKey(): string | undefined {
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  })?.trim() || undefined;
}

function hasPremium(info: CustomerInfo): boolean {
  return Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT]);
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [currentOffering, setCurrentOffering] =
    useState<PurchasesOffering | null>(null);

  // Configura RevenueCat con el uid de Firebase como appUserID: así el
  // webhook del backend puede mapear compras -> users/{uid} en Firestore.
  useEffect(() => {
    let cancelled = false;
    const apiKey = rcApiKey();
    if (!apiKey || !user) {
      setAvailable(false);
      setIsPremium(false);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        Purchases.setLogLevel(LOG_LEVEL.WARN);
        Purchases.configure({ apiKey, appUserID: user.uid });
        const [info, offerings] = await Promise.all([
          Purchases.getCustomerInfo(),
          Purchases.getOfferings(),
        ]);
        if (cancelled) return;
        setIsPremium(hasPremium(info));
        setCurrentOffering(offerings.current ?? null);
        setAvailable(true);
      } catch {
        // Expo Go (sin módulo nativo) o stores sin configurar: degradar a free.
        if (!cancelled) setAvailable(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!available) return;
    const listener = (info: CustomerInfo) => setIsPremium(hasPremium(info));
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [available]);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    setIsPremium(hasPremium(customerInfo));
  }, []);

  const restore = useCallback(async () => {
    const info = await Purchases.restorePurchases();
    setIsPremium(hasPremium(info));
  }, []);

  const value = useMemo(
    () => ({ isPremium, available, loading, currentOffering, purchase, restore }),
    [isPremium, available, loading, currentOffering, purchase, restore]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx)
    throw new Error("useSubscription debe usarse dentro de <SubscriptionProvider>");
  return ctx;
}
