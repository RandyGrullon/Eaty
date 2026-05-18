"use client";

import { FirebaseEnvErrorScreen } from "@/components/app/firebase-env-error";
import { ImageDescriptionStep } from "@/components/app/image-description-step";
import { AnalyzingFoodOverlay } from "@/components/app/analyzing-food-overlay";
import { isFirebaseConfigReady } from "@/lib/firebase-config";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useToast } from "@/hooks/use-toast";
import { useFoodAnalysis } from "@/hooks/use-food-analysis";
import { usePWA } from "@/hooks/use-pwa";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMainTabScroll } from "@/hooks/use-main-tab-scroll";
import { useCalorieTracker } from "@/hooks/use-calorie-tracker";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import {
  MealHistoryLazy,
  ProfilePageLazy,
  ScanScreenLazy,
} from "@/components/app/lazy-tab-panels";
import { AuthScreen } from "@/components/auth/auth-screen";
import { DashboardScreen } from "@/components/dashboard/dashboard-screen";
import { AnalysisResults } from "@/components/analysis/analysis-results";
import { ImageAnalysisFailure } from "@/components/analysis/image-analysis-failure";
import type { MainTab } from "@/lib/main-tab";
import { logger } from "@/lib/logger";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { SidebarNav } from "@/components/navigation/sidebar-nav";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { AuthProvider } from "@/hooks/use-auth";
import { UserProfileProvider } from "@/hooks/use-user-profile";
import { Loader2 } from "lucide-react";

function AppContent() {
  const { user, loading, signInAnonymously } = useAuth();
  const { userProfile, profileLoading, refreshUserProfile } = useUserProfile();

  useEffect(() => {
    if (!loading && !user) {
      void signInAnonymously().catch((e) => logger.error("Guest login failed", e));
    }
  }, [user, loading, signInAnonymously]);

  const { isInstalled } = usePWA();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { refreshData: refreshCalorieData } = useCalorieTracker();
  useOfflineSync(refreshCalorieData);

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem("eaty-guide-seen");
    if (!hasSeenGuide && userProfile && !loading && !profileLoading) {
      setTimeout(() => {
        toast({
          title: "¡Bienvenido a Eaty!",
          description: "Desliza para ver tus estadísticas o pulsa en Escanear para analizar tu comida.",
        });
        localStorage.setItem("eaty-guide-seen", "true");
      }, 2000);
    }
  }, [userProfile, loading, profileLoading, toast]);
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
  } = useFoodAnalysis(refreshCalorieData);
  const [activeTab, setActiveTab] = useState<MainTab>("home");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imageDescription, setImageDescription] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const mainTabsVisible =
    !loading &&
    !profileLoading &&
    user != null &&
    userProfile != null &&
    selectedImage === null &&
    !analysisResult &&
    !isAnalyzing &&
    !imageAnalysisError;

  const { scrollRef } = useMainTabScroll(
    mainTabsVisible && isMobile,
    activeTab,
    setActiveTab
  );

  const tabPanelClass =
    "flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain min-w-0";

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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

  if (!userProfile) {
    return (
      <>
        <OnboardingWizard
          onComplete={() => {
            void refreshUserProfile();
          }}
        />
        <OfflineIndicator />
        {!isInstalled && <InstallPrompt />}
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

  const handleViewHistory = () => {
    setActiveTab("history");
  };

  const handleSaveAnalysis = async (editedData?: any) => {
    if (!user) return;
    await saveAnalysis(editedData);
    
    // Evaluar logros
    const { evaluateAchievements } = await import("@/lib/meals");
    const newAchievements = await evaluateAchievements(user.uid);
    if (newAchievements.length > 0) {
      const { toast } = await import("@/hooks/use-toast");
      // @ts-ignore
      newAchievements.forEach(id => {
        // @ts-ignore
        toast({
          title: "🏆 ¡Nuevo Logro!",
          description: "Has desbloqueado una nueva medalla en tu perfil.",
        });
      });
    }

    setRefreshKey((prev) => prev + 1);
    setActiveTab("home");
  };

  const handleBackToHome = () => {
    clearAnalysis();
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

  if (selectedImage) {
    return (
      <>
        <ImageDescriptionStep
          file={selectedImage}
          description={imageDescription}
          onDescriptionChange={setImageDescription}
          onCancel={handleCancelDescription}
          onSubmit={handleDescriptionSubmit}
        />
        <OfflineIndicator />
      </>
    );
  }

  if (analysisResult) {
    return (
      <>
        <AnalysisResults
          result={analysisResult}
          imagePreviewUrl={imagePreviewUrl}
          onBack={handleBackToHome}
          onSave={handleSaveAnalysis}
          isSaving={isSaving}
        />
        <OfflineIndicator />
      </>
    );
  }

  if (isAnalyzing) {
    return (
      <>
        <AnalyzingFoodOverlay />
        <OfflineIndicator />
      </>
    );
  }

  if (imageAnalysisError) {
    return (
      <>
        <ImageAnalysisFailure
          message={imageAnalysisError}
          imagePreviewUrl={imagePreviewUrl}
          onRetry={retryImageAnalysis}
          onDismiss={() => {
            dismissImageAnalysisError();
            setActiveTab("home");
          }}
        />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background">
      {!isMobile && (
        <SidebarNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}
      <div
        className={`flex min-h-0 flex-1 flex-col ${!isMobile ? "ml-64" : "w-full"}`}
      >
        {isMobile ? (
          <div
            ref={scrollRef}
            className="flex min-h-0 flex-1 w-full min-w-0 max-w-full snap-x snap-mandatory overflow-x-auto overflow-y-clip overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <section
              aria-hidden={activeTab !== "home"}
              inert={activeTab !== "home" ? true : undefined}
              className="flex h-full max-h-full min-h-0 w-full max-w-full shrink-0 grow-0 basis-full snap-start [scroll-snap-stop:always] flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain min-w-0"
            >
              <DashboardScreen
                key={refreshKey}
                onViewHistory={handleViewHistory}
              />
            </section>
            <section
              aria-hidden={activeTab !== "scan"}
              inert={activeTab !== "scan" ? true : undefined}
              className="flex h-full max-h-full min-h-0 w-full max-w-full shrink-0 grow-0 basis-full snap-start [scroll-snap-stop:always] flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain min-w-0"
            >
              <ScanScreenLazy
                onScanFood={handleScanFood}
                onImageSelected={handleImageSelected}
              />
            </section>
            <section
              aria-hidden={activeTab !== "history"}
              inert={activeTab !== "history" ? true : undefined}
              className="flex h-full max-h-full min-h-0 w-full max-w-full shrink-0 grow-0 basis-full snap-start [scroll-snap-stop:always] flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain min-w-0"
            >
              <MealHistoryLazy onBack={() => setActiveTab("home")} />
            </section>
            <section
              aria-hidden={activeTab !== "profile"}
              inert={activeTab !== "profile" ? true : undefined}
              className="flex h-full max-h-full min-h-0 w-full max-w-full shrink-0 grow-0 basis-full snap-start [scroll-snap-stop:always] flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain min-w-0"
            >
              <ProfilePageLazy />
            </section>
          </div>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 sm:p-10">
              <div className="mx-auto w-full max-w-5xl">
                {activeTab === "home" ? (
                  <section className={tabPanelClass}>
                    <DashboardScreen
                      key={refreshKey}
                      onViewHistory={handleViewHistory}
                    />
                  </section>
                ) : null}
                {activeTab === "scan" ? (
                  <section className={tabPanelClass}>
                    <ScanScreenLazy
                      onScanFood={handleScanFood}
                      onImageSelected={handleImageSelected}
                    />
                  </section>
                ) : null}
                {activeTab === "history" ? (
                  <section className={tabPanelClass}>
                    <MealHistoryLazy onBack={() => setActiveTab("home")} />
                  </section>
                ) : null}
                {activeTab === "profile" ? (
                  <section className={tabPanelClass}>
                    <ProfilePageLazy />
                  </section>
                ) : null}
              </div>
            </main>
          </div>
        )}
      </div>
      {isMobile && (
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}
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
      <UserProfileProvider>
        <AppContent />
      </UserProfileProvider>
    </AuthProvider>
  );
}
