import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import { listenToMeals } from "@/lib/meals";
import { listenToProfile } from "@/lib/profile";
import {
  deriveCalorieData,
  deriveTodayStats,
  deriveWeeklyProgress,
  type CalorieData,
  type WeeklyProgress,
} from "@/lib/app-data-derive";
import type { Meal, UserProfile } from "@/types/meal";

/** Ventana de historial cargada en vivo (90 días cubre dashboard + historial). */
const HISTORY_DAYS = 90;

type AppDataContextValue = {
  profile: UserProfile | null;
  meals: Meal[];
  loading: boolean;
  error: string | null;
  calorieData: CalorieData | null;
  weeklyProgress: WeeklyProgress;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [profileReady, setProfileReady] = useState(false);
  const [mealsReady, setMealsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setMeals([]);
      setProfileReady(false);
      setMealsReady(false);
      setError(null);
      return;
    }
    const start = new Date();
    start.setDate(start.getDate() - HISTORY_DAYS);
    start.setHours(0, 0, 0, 0);

    const unsubProfile = listenToProfile(
      user.uid,
      (p) => {
        setProfile(p);
        setProfileReady(true);
      },
      (e) => setError(e.message)
    );
    const unsubMeals = listenToMeals(
      user.uid,
      (m) => {
        setMeals(m);
        setMealsReady(true);
      },
      (e) => setError(e.message),
      { start }
    );
    return () => {
      unsubProfile();
      unsubMeals();
    };
  }, [user]);

  const value = useMemo<AppDataContextValue>(() => {
    const today = deriveTodayStats(meals, 0);
    return {
      profile,
      meals,
      loading: Boolean(user) && (!profileReady || !mealsReady),
      error,
      calorieData: deriveCalorieData(profile, today),
      weeklyProgress: deriveWeeklyProgress(meals),
    };
  }, [user, profile, meals, profileReady, mealsReady, error]);

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData debe usarse dentro de <AppDataProvider>");
  return ctx;
}
