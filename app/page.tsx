"use client";

import { Button } from "@/components/ui/button";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useFoodAnalysis } from "@/hooks/use-food-analysis";
import { usePWA } from "@/hooks/use-pwa";
import { AuthScreen } from "@/components/auth/auth-screen";
import { HomeScreen } from "@/components/home/home-screen";
import { AnalysisResults } from "@/components/analysis/analysis-results";
import { MealHistory } from "@/components/history/meal-history";
import { ProfilePage } from "@/components/profile/profile-page";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { AuthProvider } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

function AppContent() {
  const { user, loading } = useAuth();
  const { isInstalled } = usePWA();
  const {
    isAnalyzing,
    isSaving,
    analysisResult,
    error,
    analyzeImage,
    analyzeText,
    saveAnalysis,
    clearAnalysis,
  } = useFoodAnalysis();
  const [activeTab, setActiveTab] = useState<
    "home" | "scan" | "history" | "profile"
  >("home");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imageDescription, setImageDescription] = useState("");

  if (loading) {
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
    setActiveTab("home");
  };

  const handleBackToHome = () => {
    clearAnalysis();
    setActiveTab("home");
  };

  const handleImageSelected = (file: File) => {
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
            <div className="max-w-md mx-auto">
              <h1 className="text-xl font-bold">Agregar Descripción</h1>
              <p className="text-sm opacity-90">
                Agrega contexto adicional para un mejor análisis
              </p>
            </div>
          </div>
          <div className="flex-1 p-4 max-w-md mx-auto w-full">
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

  // Show error state
  if (error) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="text-destructive text-lg font-semibold mb-2">
              Error
            </div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleBackToHome} className="w-full">
              Volver al Inicio
            </Button>
          </div>
        </div>
        <OfflineIndicator />
      </>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "home":
      case "scan":
        return (
          <HomeScreen
            onScanFood={handleScanFood}
            onViewHistory={handleViewHistory}
            onImageSelected={handleImageSelected}
          />
        );
      case "history":
        return <MealHistory onBack={() => setActiveTab("home")} />;
      case "profile":
        return <ProfilePage />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {renderContent()}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      <OfflineIndicator />
      {!isInstalled && <InstallPrompt />}
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
