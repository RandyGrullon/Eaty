"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, Type } from "lucide-react";

interface ScanScreenProps {
  onScanFood: (imageFile?: File, foodName?: string) => void;
  onImageSelected?: (file: File) => void;
}

export function ScanScreen({ onScanFood, onImageSelected }: ScanScreenProps) {
  const [foodName, setFoodName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onImageSelected) {
        onImageSelected(file);
      } else {
        onScanFood(file);
      }
    }
  };

  const handleTextAnalysis = () => {
    if (foodName.trim()) {
      onScanFood(undefined, foodName.trim());
      setFoodName("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold">Escanear Alimento</h1>
          <p className="text-sm opacity-90">
            Toma una foto o escribe el nombre de tu plato
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* Welcome Card */}
          <Card className="bg-card">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-card-foreground mb-2">
                  Analiza tu comida
                </h2>
                <p className="text-muted-foreground text-sm">
                  Toma una foto o escribe el nombre de tu plato para obtener
                  información nutricional completa
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Scan Options */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Camera Scan */}
            <Button
              onClick={handleCameraCapture}
              className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90"
            >
              <Camera className="mr-3 h-6 w-6" />
              Tomar Foto
            </Button>

            {/* Upload from Gallery */}
            <Button
              onClick={handleFileUpload}
              variant="outline"
              className="w-full h-14 text-lg font-semibold border-primary text-primary hover:bg-primary/5 bg-transparent"
            >
              <Upload className="mr-3 h-6 w-6" />
              Subir desde Galería
            </Button>
          </div>

          {/* Text Input Alternative */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border"></div>
              <span className="text-sm text-muted-foreground px-2 whitespace-nowrap">
                O escribe el nombre
              </span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Ej: Pizza margarita, ensalada césar..."
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                className="flex-1"
                onKeyPress={(e) => e.key === "Enter" && handleTextAnalysis()}
              />
              <Button
                onClick={handleTextAnalysis}
                disabled={!foodName.trim()}
                className="px-4 shrink-0"
              >
                <Type className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Hidden Input Fields */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            ref={cameraInputRef}
            onChange={handleImageChange}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />
        </div>
      </div>
    </div>
  );
}