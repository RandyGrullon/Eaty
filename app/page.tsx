"use client";

import { FirebaseEnvErrorScreen } from "@/components/app/firebase-env-error";
import { ImageDescriptionStep } from "@/components/app/image-description-step";
import { AnalyzingFoodOverlay } from "@/components/app/analyzing-food-overlay";
import { ShellLoading } from "@/components/app/shell-loading";
import { DemoBanner } from "@/components/app/demo-banner";
import { SplashIntro } from "@/components/app/splash-intro";
import { isFirebaseConfigReady } from "@/lib/firebase-config";
import { Suspense, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAppData } from "@/hooks/use-app-data";
import { useToast } from "@/hooks/use-toast";
import { useFoodAnalysis } from "@/hooks/use-food-analysis";
import { usePWA } from "@/hooks/use-pwa";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import {
  MealHistoryLazy,
  ProfilePageLazy,
  ScanScreenLazy,
  WeeklyPlannerLazy,
  DietsScreenLazy,
  SettingsPageLazy,
} from "@/components/app/lazy-tab-panels";
import { LazyTabContent } from "@/components/app/lazy-tab-content";
import { MealEditorDrawer } from "@/components/meal/meal-editor-drawer";
import { CoachFab } from "@/components/coach/coach-fab";
import { AuthScreen } from "@/components/auth/auth-screen";
import { DashboardScreen } from "@/components/dashboard/dashboard-screen";
import { AnalysisResults } from "@/components/analysis/analysis-results";
import { ImageAnalysisFailure } from "@/components/analysis/image-analysis-failure";
import { MAIN_TAB_ORDER, type MainTab } from "@/lib/main-tab";
import { logger } from "@/lib/logger";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { SidebarNav } from "@/components/navigation/sidebar-nav";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { AuthProvider } from "@/hooks/use-auth";
import { AppDataProvider } from "@/hooks/use-app-data";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

/** Deep links (`?action=`) desde accesos directos de la PWA. */
const ACTION_TO_TAB: Record<string, MainTab> = {
  scan: "scan",
  history: "history",
  diets: "diets",
  profile: "profile",
  settings: "settings",
};

function AppContent() {
  const { user, loading } = useAuth();
  const { profile: userProfile, profileLoading, profileError } = useAppData();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isInstalled } = usePWA();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<MainTab>("home");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imageDescription, setImageDescription] = useState("");
  /** Día elegido en el planificador antes de ir a "Escanear" (se usa al "Planear"). */
  const [plannedDateForScan, setPlannedDateForScan] = useState<Date | null>(null);
  /** El planificador se abre como overlay desde Inicio. */
  const [plannerOpen, setPlannerOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // Deep links: se aplican una vez y se limpian de la URL para no repetirse al recargar.
  useEffect(() => {
    const action = searchParams.get("action");
    if (!action) return;
    if (action === "planning") setPlannerOpen(true);
    else if (ACTION_TO_TAB[action]) setActiveTab(ACTION_TO_TAB[action]);
    router.replace("/", { scroll: false });
  }, [searchParams, router]);

  useOfflineSync();

  const onSaveSuccess = useCallback(async () => {
    setPlannedDateForScan(null);
    setActiveTab("home");
    if (!user) return;
    try {
      const { evaluateAchievements } = await import("@/lib/meals");
      const unlocked = await evaluateAchievements(user.uid);
      if (unlocked.length > 0) {
        toast({
          title: "Nuevo logro desbloqueado",
          description:
            unlocked.length === 1
              ? "Tienes una medalla nueva en tu perfil."
              : `Tienes ${unlocked.length} medallas nuevas en tu perfil.`,
        });
      }
    } catch (e) {
      logger.error("evaluateAchievements", e);
    }
  }, [user, toast]);

  const {
    isAnalyzing,
    isSaving,
    analysisResult,
    imagePreviewUrl,
    imageAnalysisError,
    analyzeImage,
    analyzeText,
    retryImageAnalysis,
    dismissImageAnalysisError,
    saveAnalysis,
    clearAnalysis,
    setManualAnalysis,
  } = useFoodAnalysis(onSaveSuccess);

  // Al cambiar de pestaña, vuelve arriba.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  if (loading || (user && profileLoading)) {
    return <ShellLoading />;
  }

  if (!user) {
    return (
      <>
        <AuthScreen />
        <OfflineIndicator />
        {!isInstalled && <InstallPrompt />}
      </>
    );
  }

  if (profileError) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background p-6">
        <div className="surface max-w-sm p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-warning" />
          <h1 className="mt-3 text-lg font-semibold">No pudimos cargar tu perfil</h1>
          <p className="mt-1 text-sm text-muted-foreground">{profileError}</p>
          <Button className="mt-5 rounded-full" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <>
        <OnboardingWizard onComplete={() => undefined} />
        <OfflineIndicator />
      </>
    );
  }

  const handleScanFood = async (
    imageFile?: File,
    foodName?: string,
    description?: string,
    fullData?: any
  ) => {
    try {
      if (fullData) {
        setManualAnalysis(fullData);
        return;
      }
      if (imageFile) {
        await analyzeImage(imageFile, description);
      } else if (foodName) {
        await analyzeText(foodName);
      }
    } catch (error) {
      logger.error("Error scanning food", error);
    }
  };

  /** Desde el planificador: recordamos el día elegido y abrimos "Escanear". */
  const handleAddMealFromPlanner = (date: Date) => {
    setPlannedDateForScan(date);
    setPlannerOpen(false);
    setActiveTab("scan");
  };

  /** Navegación manual (barra inferior / lateral): descarta el día del planificador. */
  const handleTabChange = (tab: MainTab) => {
    setPlannedDateForScan(null);
    setActiveTab(tab);
  };

  const handleBackToHome = () => {
    clearAnalysis();
    setPlannedDateForScan(null);
    setActiveTab("home");
  };

  const handleImageSelected = (file: File) => {
    dismissImageAnalysisError();
    setSelectedImage(file);
  };

  const handleDescriptionSubmit = () => {
    if (selectedImage) {
      void handleScanFood(selectedImage, undefined, imageDescription);
      setSelectedImage(null);
      setImageDescription("");
    }
  };

  const handleCancelDescription = () => {
    setSelectedImage(null);
    setImageDescription("");
  };

  const overlay = (node: ReactNode) => (
    <>
      {node}
      <OfflineIndicator />
    </>
  );

  if (selectedImage) {
    return overlay(
      <ImageDescriptionStep
        file={selectedImage}
        description={imageDescription}
        onDescriptionChange={setImageDescription}
        onCancel={handleCancelDescription}
        onSubmit={handleDescriptionSubmit}
      />
    );
  }

  if (analysisResult) {
    return overlay(
      <AnalysisResults
        result={analysisResult}
        imagePreviewUrl={imagePreviewUrl}
        onBack={handleBackToHome}
        onSave={(edited?: any) => saveAnalysis(edited)}
        isSaving={isSaving}
        defaultPlannedDate={plannedDateForScan}
      />
    );
  }

  if (isAnalyzing) {
    return overlay(<AnalyzingFoodOverlay />);
  }

  if (imageAnalysisError) {
    return overlay(
      <ImageAnalysisFailure
        message={imageAnalysisError}
        imagePreviewUrl={imagePreviewUrl}
        onRetry={retryImageAnalysis}
        onDismiss={() => {
          dismissImageAnalysisError();
          setActiveTab("home");
        }}
      />
    );
  }

  if (plannerOpen) {
    return (
      <>
        <div className="h-[100dvh] overflow-y-auto bg-background">
          <WeeklyPlannerLazy onAddMeal={handleAddMealFromPlanner} onClose={() => setPlannerOpen(false)} />
        </div>
        <MealEditorDrawer />
        <OfflineIndicator />
      </>
    );
  }

  const panels: Record<MainTab, ReactNode> = {
    home: (
      <DashboardScreen
        onViewHistory={() => handleTabChange("history")}
        onOpenPlanner={() => setPlannerOpen(true)}
        onScan={() => handleTabChange("scan")}
      />
    ),
    diets: <DietsScreenLazy />,
    scan: <ScanScreenLazy onScanFood={handleScanFood} onImageSelected={handleImageSelected} />,
    history: <MealHistoryLazy onBack={() => handleTabChange("home")} />,
    profile: <ProfilePageLazy onTabChange={handleTabChange} />,
    settings: <SettingsPageLazy />,
  };

  return (
    <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-background">
      {!isMobile && <SidebarNav activeTab={activeTab} onTabChange={handleTabChange} />}
      <main
        ref={mainRef}
        className={`relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain ${
          !isMobile ? "ml-64" : ""
        }`}
      >
        <DemoBanner />
        {MAIN_TAB_ORDER.map((tab) => (
          <LazyTabContent
            key={tab}
            isActive={activeTab === tab}
            className={activeTab === tab ? "min-h-full" : "hidden"}
          >
            {panels[tab]}
          </LazyTabContent>
        ))}
      </main>
      {isMobile && <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />}
      <CoachFab />
      <MealEditorDrawer />
      <OfflineIndicator />
      {!isInstalled && <InstallPrompt />}
    </div>
  );
}

export default function Home() {
  if (!isFirebaseConfigReady()) {
    return <FirebaseEnvErrorScreen />;
  }

  return (
    <AuthProvider>
      <SplashIntro />
      <AppDataProvider>
        <Suspense fallback={<ShellLoading />}>
          <AppContent />
        </Suspense>
      </AppDataProvider>
    </AuthProvider>
  );
}
