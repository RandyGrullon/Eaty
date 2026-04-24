"use client";

import { FirebaseEnvErrorScreen } from "@/components/app/firebase-env-error";
import { isFirebaseConfigReady } from "@/lib/firebase-config";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useFoodAnalysis } from "@/hooks/use-food-analysis";
import { usePWA } from "@/hooks/use-pwa";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMainTabScroll } from "@/hooks/use-main-tab-scroll";
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
import { getUserProfile } from "@/lib/meals";
import type { UserProfile } from "@/types/meal";
import { Loader2 } from "lucide-react";

function AppContent() {
  const { user, loading } = useAuth();
  const { isInstalled } = usePWA();
  const isMobile = useIsMobile();
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
  } = useFoodAnalysis();
  const [activeTab, setActiveTab] = useState<MainTab>("home");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imageDescription, setImageDescription] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    setProfileLoading(true);
    try {
      const profile = await getUserProfile(user.uid);
      setUserProfile(profile);
    } catch (error) {
      logger.error("Error loading user profile", error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    loadUserProfile();
  };

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
    mainTabsVisible,
    activeTab,
    setActiveTab
  );

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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

  // Show onboarding wizard if user doesn't have a complete profile
  if (!userProfile) {
    return (
      <>
        <OnboardingWizard onComplete={handleOnboardingComplete} />
        <OfflineIndicator />
        {!isInstalled && <InstallPrompt />}
      </>
    );
  }

  const handleScanFood = async (
    imageFile?: File,
    foodName?: string,
    description?: string
  ) => {
    try {
      if (imageFile) {
        await analyzeImage(imageFile, description);
      } else if (foodName) {
        await analyzeText(foodName);
      }
    } catch (error) {
      console.error("Error scanning food:", error);
    }
  };

  const handleViewHistory = () => {
    setActiveTab("history");
  };

  const handleSaveAnalysis = async () => {
    await saveAnalysis();
    // Refresh home screen stats after saving
    setRefreshKey(prev => prev + 1);
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
      handleScanFood(selectedImage, undefined, imageDescription);
      setSelectedImage(null);
      setImageDescription("");
    }
  };

  const handleCancelDescription = () => {
    setSelectedImage(null);
    setImageDescription("");
  };

  // Show image description screen if image is selected
  if (selectedImage) {
    return (
      <>
        <div className="min-h-screen bg-background flex flex-col">
          <div className="bg-primary text-primary-foreground p-4">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-xl font-bold">Agregar Descripción</h1>
              <p className="text-sm opacity-90">
                Puedes dejar la descripción vacía: la IA nombra el plato y estima
                según la foto. Un texto extra mejora la precisión.
              </p>
            </div>
          </div>
          <div className="flex-1 p-4 max-w-4xl mx-auto w-full">
            <div className="space-y-4">
              <div className="bg-card rounded-lg p-4">
                <img
                  src={URL.createObjectURL(selectedImage)}
                  alt="Imagen seleccionada"
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-card-foreground">
                  Descripción (opcional)
                </label>
                <textarea
                  value={imageDescription}
                  onChange={(e) => setImageDescription(e.target.value)}
                  placeholder="Ej: Pizza con pepperoni, ensalada con aderezo de vinagreta, etc."
                  className="w-full p-3 border border-input rounded-lg bg-background text-sm resize-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleCancelDescription}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleDescriptionSubmit}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  Analizar
                </Button>
              </div>
            </div>
          </div>
        </div>
        <OfflineIndicator />
      </>
    );
  }

  // Show analysis results if available
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

  // Show loading state during analysis
  if (isAnalyzing) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-primary">
              Analizando comida...
            </p>
            <p className="text-sm text-muted-foreground">
              Esto puede tomar unos segundos
            </p>
          </div>
        </div>
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
      <AppContent />
    </AuthProvider>
  );
}
