"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  collection,
  doc,
  query,
  orderBy,
  limit as limitFn,
  onSnapshot,
  updateDoc,
  deleteField,
  Timestamp,
} from "firebase/firestore";
import { appFirebase } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { logger } from "@/lib/logger";
import { mealFromDoc } from "@/lib/firestore-meal-utils";
import { normalizeBirthDateFromFirestore } from "@/lib/age-from-birthdate";
import {
  fromDateInputValue,
  localDayKey,
  msUntilNextLocalMidnight,
} from "@/lib/date-format";
import { normalizeMeasure } from "@/lib/profile-measure";
import { decryptLegacyData } from "@/lib/encryption";
import {
  deriveTodayStats,
  deriveWeeklyProgress,
  deriveCalorieData,
  type CalorieData,
  type TodayStats,
  type WeeklyProgress,
  type WeekBucket,
} from "@/lib/app-data-derive";
import {
  updateMeal as updateMealDb,
  deleteMeal as deleteMealDb,
  saveMeal as saveMealDb,
  updateWaterGlasses,
  updateUserProfile,
  type MealUpdatePayload,
  type SaveMealOptions,
  type SaveMealResult,
} from "@/lib/meals";
import {
  dietFromDoc,
  createDiet as createDietDb,
  updateDiet as updateDietDb,
  deleteDiet as deleteDietDb,
  saveDishTutorial as saveDishTutorialDb,
  saveDishImage as saveDishImageDb,
  type NewDiet,
} from "@/lib/diets";
import {
  workoutFromDoc,
  saveWorkout as saveWorkoutDb,
  deleteWorkout as deleteWorkoutDb,
} from "@/lib/workouts";
import type { Meal, UserProfile } from "@/types/meal";
import type { Diet, DietDish, DishTutorial } from "@/types/diet";
import type { GeneratedWorkout, Workout } from "@/types/workout";

const MEALS_WINDOW = 1000;

export type { CalorieData, TodayStats, WeeklyProgress };

type AppDataContextValue = {
  // Estado crudo (tiempo real)
  profile: UserProfile | null;
  meals: Meal[];
  diets: Diet[];
  workouts: Workout[];
  // Flags
  loading: boolean;
  profileLoading: boolean;
  /** Error al leer el perfil en tiempo real (p. ej. permisos/red); `null` si no hay. */
  profileError: string | null;
  // Derivados
  recentMeals: Meal[];
  todayMeals: Meal[];
  todayStats: TodayStats;
  calorieData: CalorieData | null;
  weeklyProgress: WeeklyProgress;
  activeDiet: Diet | null;
  // Editor global de comidas
  editingMeal: Meal | null;
  openMealEditor: (meal: Meal) => void;
  closeMealEditor: () => void;
  // Acciones de comida
  updateMeal: (mealId: string, data: MealUpdatePayload) => Promise<void>;
  deleteMeal: (mealId: string) => Promise<void>;
  saveMeal: (
    mealData: Omit<Meal, "id" | "createdAt">,
    options?: SaveMealOptions & { plannedDate?: Date }
  ) => Promise<SaveMealResult>;
  setWaterGlasses: (delta: number) => Promise<void>;
  // Acciones de dieta
  createDiet: (diet: NewDiet) => Promise<string>;
  updateDiet: (dietId: string, patch: Partial<NewDiet>) => Promise<void>;
  deleteDiet: (dietId: string) => Promise<void>;
  saveDishTutorial: (
    diet: Diet,
    dishId: string,
    tutorial: DishTutorial
  ) => Promise<void>;
  saveDishImage: (diet: Diet, dishId: string, url: string) => Promise<void>;
  activateDiet: (diet: Diet) => Promise<void>;
  deactivateDiet: () => Promise<void>;
  // Acciones de rutina
  saveWorkout: (workout: GeneratedWorkout) => Promise<string>;
  deleteWorkout: (workoutId: string) => Promise<void>;
  // Compat
  refresh: () => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

const EMPTY_TODAY: TodayStats = {
  mealsCount: 0,
  totalCalories: 0,
  macros: { protein: 0, carbs: 0, fat: 0 },
  waterGlasses: 0,
};

const EMPTY_WEEK: WeekBucket = {
  totalMeals: 0,
  totalCalories: 0,
  averageCalories: 0,
  daysActive: 0,
};

const EMPTY_WEEKLY: WeeklyProgress = {
  currentWeek: EMPTY_WEEK,
  previousWeek: EMPTY_WEEK,
  progress: { mealsChange: 0, caloriesChange: 0, daysChange: 0 },
};

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  // Día local actual ("YYYY-MM-DD"); se actualiza a medianoche para re-suscribir la hidratación.
  const [dayKey, setDayKey] = useState<string>(() => localDayKey());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [waterGlasses, setWaterGlassesState] = useState(0);
  const [diets, setDiets] = useState<Diet[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  const [profileResolved, setProfileResolved] = useState(false);
  const [mealsResolved, setMealsResolved] = useState(false);

  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  // Perfil en tiempo real.
  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setProfileError(null);
      setProfileResolved(!authLoading);
      return;
    }
    setProfileResolved(false);
    setProfileError(null);
    let seq = 0;
    let active = true;
    const decrypt = (cipher: string) => decryptLegacyData(cipher, uid);
    const ref = doc(appFirebase.db, "users", uid, "profile", "main");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const mySeq = ++seq;
        setProfileError(null);
        if (!snap.exists()) {
          setProfile(null);
          setProfileResolved(true);
          return;
        }
        const data = snap.data();
        const { birthDate, createdAt, updatedAt, weight, height, ...rest } =
          data;
        // Peso/altura: siempre números. Los valores cifrados de versiones
        // antiguas se descifran; los strings numéricos se convierten.
        void Promise.all([
          normalizeMeasure(weight, decrypt),
          normalizeMeasure(height, decrypt),
        ]).then(([weightNum, heightNum]) => {
          if (!active || mySeq !== seq) return;
          setProfile({
            ...(rest as Omit<
              UserProfile,
              "birthDate" | "createdAt" | "updatedAt" | "weight" | "height"
            >),
            weight: weightNum,
            height: heightNum,
            birthDate: normalizeBirthDateFromFirestore(birthDate),
            createdAt: createdAt?.toDate?.() ?? new Date(0),
            updatedAt: updatedAt?.toDate?.() ?? new Date(0),
          } as UserProfile);
          setProfileResolved(true);
        });
      },
      (err) => {
        logger.error("AppData profile snapshot", err);
        if (!active) return;
        setProfileError(
          err instanceof Error && err.message
            ? `No se pudo cargar tu perfil: ${err.message}`
            : "No se pudo cargar tu perfil."
        );
        setProfileResolved(true);
      }
    );
    return () => {
      active = false;
      unsub();
    };
  }, [uid, authLoading]);

  // Comidas en tiempo real (ventana acotada).
  useEffect(() => {
    if (!uid) {
      setMeals([]);
      setMealsResolved(!authLoading);
      return;
    }
    setMealsResolved(false);
    const q = query(
      collection(appFirebase.db, "users", uid, "meals"),
      orderBy("createdAt", "desc"),
      limitFn(MEALS_WINDOW)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMeals(snap.docs.map(mealFromDoc));
        setMealsResolved(true);
      },
      (err) => {
        logger.error("AppData meals snapshot", err);
        setMealsResolved(true);
      }
    );
    return unsub;
  }, [uid, authLoading]);

  // Cambio de día: a medianoche local se actualiza `dayKey` (re-suscribe la hidratación).
  useEffect(() => {
    const timer = setTimeout(() => {
      setDayKey(localDayKey());
    }, msUntilNextLocalMidnight() + 1000);
    return () => clearTimeout(timer);
  }, [dayKey]);

  // Hidratación del día.
  useEffect(() => {
    if (!uid) {
      setWaterGlassesState(0);
      return;
    }
    const ref = doc(appFirebase.db, "users", uid, "dailyStats", dayKey);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setWaterGlassesState(snap.exists() ? snap.data().waterGlasses || 0 : 0);
      },
      (err) => logger.error("AppData dailyStats snapshot", err)
    );
    return unsub;
  }, [uid, dayKey]);

  // Dietas en tiempo real.
  useEffect(() => {
    if (!uid) {
      setDiets([]);
      return;
    }
    const q = query(
      collection(appFirebase.db, "users", uid, "diets"),
      orderBy("updatedAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => setDiets(snap.docs.map(dietFromDoc)),
      (err) => logger.error("AppData diets snapshot", err)
    );
    return unsub;
  }, [uid]);

  // Rutinas en tiempo real.
  useEffect(() => {
    if (!uid) {
      setWorkouts([]);
      return;
    }
    const q = query(
      collection(appFirebase.db, "users", uid, "workouts"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => setWorkouts(snap.docs.map(workoutFromDoc)),
      (err) => logger.error("AppData workouts snapshot", err)
    );
    return unsub;
  }, [uid]);

  // Derivados.
  const todayStats = useMemo(
    () =>
      uid
        ? deriveTodayStats(meals, waterGlasses, fromDateInputValue(dayKey))
        : EMPTY_TODAY,
    // `dayKey` fuerza el recálculo al cambiar de día.
    [uid, meals, waterGlasses, dayKey]
  );
  const weeklyProgress = useMemo(
    () =>
      uid ? deriveWeeklyProgress(meals, fromDateInputValue(dayKey)) : EMPTY_WEEKLY,
    [uid, meals, dayKey]
  );
  const calorieData = useMemo(
    () => deriveCalorieData(profile, todayStats),
    [profile, todayStats]
  );
  const recentMeals = useMemo(
    () => meals.filter((m) => !m.isPlanned).slice(0, 5),
    [meals]
  );
  const todayMeals = useMemo(() => {
    const start = fromDateInputValue(dayKey);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return meals.filter(
      (m) => !m.isPlanned && m.createdAt >= start && m.createdAt < end
    );
  }, [meals, dayKey]);
  const activeDiet = useMemo(
    () => diets.find((d) => d.id === profile?.activeDietId) ?? null,
    [diets, profile?.activeDietId]
  );

  // Acciones.
  const requireUid = useCallback((): string => {
    if (!uid) throw new Error("Sesión no iniciada.");
    return uid;
  }, [uid]);

  const updateMeal = useCallback(
    (mealId: string, data: MealUpdatePayload) =>
      updateMealDb(requireUid(), mealId, data),
    [requireUid]
  );
  const deleteMeal = useCallback(
    (mealId: string) => deleteMealDb(requireUid(), mealId),
    [requireUid]
  );
  const saveMeal = useCallback(
    (
      mealData: Omit<Meal, "id" | "createdAt">,
      options?: SaveMealOptions & { plannedDate?: Date }
    ) => saveMealDb(requireUid(), mealData, options),
    [requireUid]
  );
  const setWaterGlasses = useCallback(
    async (delta: number) => {
      await updateWaterGlasses(requireUid(), delta);
    },
    [requireUid]
  );

  const createDiet = useCallback(
    (diet: NewDiet) => createDietDb(requireUid(), diet),
    [requireUid]
  );
  const updateDiet = useCallback(
    (dietId: string, patch: Partial<NewDiet>) =>
      updateDietDb(requireUid(), dietId, patch),
    [requireUid]
  );
  const deleteDiet = useCallback(
    (dietId: string) => deleteDietDb(requireUid(), dietId),
    [requireUid]
  );
  const saveDishTutorial = useCallback(
    (diet: Diet, dishId: string, tutorial: DishTutorial) =>
      saveDishTutorialDb(requireUid(), diet, dishId, tutorial),
    [requireUid]
  );
  const saveDishImage = useCallback(
    (diet: Diet, dishId: string, url: string) =>
      saveDishImageDb(requireUid(), diet, dishId, url),
    [requireUid]
  );
  const activateDiet = useCallback(
    async (diet: Diet) => {
      await updateUserProfile(requireUid(), {
        activeDietId: diet.id,
        customGoals: {
          calories: diet.targetCalories,
          protein: diet.targetMacros.protein,
          carbs: diet.targetMacros.carbs,
          fat: diet.targetMacros.fat,
        },
      });
    },
    [requireUid]
  );
  const deactivateDiet = useCallback(async () => {
    const ref = doc(appFirebase.db, "users", requireUid(), "profile", "main");
    await updateDoc(ref, {
      activeDietId: deleteField(),
      customGoals: deleteField(),
      updatedAt: Timestamp.now(),
    });
  }, [requireUid]);

  const saveWorkout = useCallback(
    (workout: GeneratedWorkout) => saveWorkoutDb(requireUid(), workout),
    [requireUid]
  );
  const deleteWorkout = useCallback(
    (workoutId: string) => deleteWorkoutDb(requireUid(), workoutId),
    [requireUid]
  );

  const openMealEditor = useCallback((meal: Meal) => setEditingMeal(meal), []);
  const closeMealEditor = useCallback(() => setEditingMeal(null), []);

  // En tiempo real no se necesita refrescar; se deja por compatibilidad.
  const refresh = useCallback(async () => {}, []);

  const loading = authLoading || !profileResolved || !mealsResolved;
  const profileLoading = authLoading || !profileResolved;

  const value: AppDataContextValue = {
    profile,
    meals,
    diets,
    workouts,
    loading,
    profileLoading,
    profileError,
    recentMeals,
    todayMeals,
    todayStats,
    calorieData,
    weeklyProgress,
    activeDiet,
    editingMeal,
    openMealEditor,
    closeMealEditor,
    updateMeal,
    deleteMeal,
    saveMeal,
    setWaterGlasses,
    createDiet,
    updateDiet,
    deleteDiet,
    saveDishTutorial,
    saveDishImage,
    activateDiet,
    deactivateDiet,
    saveWorkout,
    deleteWorkout,
    refresh,
  };

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (ctx === undefined) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  return ctx;
}
