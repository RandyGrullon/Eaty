"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ChevronRight,
  User,
  Target,
  Activity,
  Loader2,
  Settings,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { saveUserProfile } from "@/lib/meals";
import type { UserProfile } from "@/types/meal";

interface OnboardingWizardProps {
  onComplete?: () => void;
}

interface OnboardingData {
  age: string;
  gender: "male" | "female" | "other";
  weight: string;
  weightUnit: "kg" | "lbs";
  height: string;
  heightUnit: "cm" | "inches";
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user, logout } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    age: "",
    gender: "male",
    weight: "",
    weightUnit: "kg",
    height: "",
    heightUnit: "cm",
    activityLevel: "moderate",
  });

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const updateData = (field: keyof OnboardingData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Convertir unidades a valores estándar
      const weightInKg =
        data.weightUnit === "lbs"
          ? parseFloat(data.weight) * 0.453592
          : parseFloat(data.weight);

      const heightInCm =
        data.heightUnit === "inches"
          ? parseFloat(data.height) * 2.54
          : parseFloat(data.height);

      const profileData: Omit<UserProfile, "uid" | "createdAt" | "updatedAt"> =
        {
          age: parseInt(data.age),
          gender: data.gender,
          weight: Math.round(weightInKg * 10) / 10, // Redondear a 1 decimal
          height: Math.round(heightInCm * 10) / 10, // Redondear a 1 decimal
          activityLevel: data.activityLevel,
        };

      await saveUserProfile(user.uid, profileData);
      onComplete?.();
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return (
          data.age && parseInt(data.age) >= 13 && parseInt(data.age) <= 120
        );
      case 2:
        return data.gender;
      case 3:
        return (
          data.weight &&
          parseFloat(data.weight) > 0 &&
          data.height &&
          parseFloat(data.height) > 0
        );
      case 4:
        return data.activityLevel;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <User className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">
                Información Personal
              </h2>
              <p className="text-muted-foreground">
                Cuéntanos un poco sobre ti
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="age">Edad</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="Ingresa tu edad"
                  value={data.age}
                  onChange={(e) => updateData("age", e.target.value)}
                  min="13"
                  max="120"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Debes tener al menos 13 años
                </p>
              </div>

              <div>
                <Label>Sexo</Label>
                <RadioGroup
                  value={data.gender}
                  onValueChange={(value) =>
                    updateData("gender", value as OnboardingData["gender"])
                  }
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male">Masculino</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female">Femenino</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other">Otro</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Target className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">
                Medidas Corporales
              </h2>
              <p className="text-muted-foreground">
                Necesitamos tus medidas para calcular mejor tus necesidades
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="weight">Peso</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="weight"
                    type="number"
                    placeholder={
                      data.weightUnit === "kg" ? "Ej: 70" : "Ej: 154"
                    }
                    value={data.weight}
                    onChange={(e) => updateData("weight", e.target.value)}
                    min={data.weightUnit === "kg" ? "30" : "66"}
                    max={data.weightUnit === "kg" ? "300" : "661"}
                    step="0.1"
                    className="flex-1"
                  />
                  <Select
                    value={data.weightUnit}
                    onValueChange={(value) =>
                      updateData("weightUnit", value as "kg" | "lbs")
                    }
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="lbs">lbs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="height">Altura</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="height"
                    type="number"
                    placeholder={
                      data.heightUnit === "cm" ? "Ej: 170" : "Ej: 67"
                    }
                    value={data.height}
                    onChange={(e) => updateData("height", e.target.value)}
                    min={data.heightUnit === "cm" ? "100" : "39"}
                    max={data.heightUnit === "cm" ? "250" : "98"}
                    step="0.1"
                    className="flex-1"
                  />
                  <Select
                    value={data.heightUnit}
                    onValueChange={(value) =>
                      updateData("heightUnit", value as "cm" | "inches")
                    }
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cm">cm</SelectItem>
                      <SelectItem value="inches">inches</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Activity className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">
                Nivel de Actividad
              </h2>
              <p className="text-muted-foreground">
                ¿Qué tan activo eres físicamente?
              </p>
            </div>

            <div className="space-y-4">
              <RadioGroup
                value={data.activityLevel}
                onValueChange={(value) =>
                  updateData(
                    "activityLevel",
                    value as OnboardingData["activityLevel"]
                  )
                }
              >
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                    <RadioGroupItem
                      value="sedentary"
                      id="sedentary"
                      className="mt-1"
                    />
                    <div>
                      <Label htmlFor="sedentary" className="font-medium">
                        Sedentario
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Poco o ningún ejercicio
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="light" id="light" className="mt-1" />
                    <div>
                      <Label htmlFor="light" className="font-medium">
                        Ligero
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Ejercicio ligero 1-3 días/semana
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                    <RadioGroupItem
                      value="moderate"
                      id="moderate"
                      className="mt-1"
                    />
                    <div>
                      <Label htmlFor="moderate" className="font-medium">
                        Moderado
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Ejercicio moderado 3-5 días/semana
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                    <RadioGroupItem
                      value="active"
                      id="active"
                      className="mt-1"
                    />
                    <div>
                      <Label htmlFor="active" className="font-medium">
                        Activo
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Ejercicio intenso 6-7 días/semana
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                    <RadioGroupItem
                      value="very_active"
                      id="very_active"
                      className="mt-1"
                    />
                    <div>
                      <Label htmlFor="very_active" className="font-medium">
                        Muy Activo
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Ejercicio muy intenso o trabajo físico
                      </p>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-primary mb-2">¡Listo!</h2>
              <p className="text-muted-foreground">
                Revisa tu información antes de continuar
              </p>
            </div>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Edad:</span>
                  <span className="font-medium">{data.age} años</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sexo:</span>
                  <span className="font-medium">
                    {data.gender === "male"
                      ? "Masculino"
                      : data.gender === "female"
                      ? "Femenino"
                      : "Otro"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Peso:</span>
                  <span className="font-medium">
                    {data.weight} {data.weightUnit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Altura:</span>
                  <span className="font-medium">
                    {data.height} {data.heightUnit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Actividad:</span>
                  <span className="font-medium">
                    {data.activityLevel === "sedentary"
                      ? "Sedentario"
                      : data.activityLevel === "light"
                      ? "Ligero"
                      : data.activityLevel === "moderate"
                      ? "Moderado"
                      : data.activityLevel === "active"
                      ? "Activo"
                      : "Muy Activo"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              Paso {currentStep} de {totalSteps}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={async () => {
                try {
                  await logout();
                } catch (error) {
                  console.error("Error al cerrar sesión:", error);
                }
              }}
              className="text-sm text-muted-foreground hover:text-destructive"
            >
              Cerrar sesión
            </Button>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>

        <CardContent className="space-y-6">
          {renderStep()}

          <div className="flex gap-3 pt-4">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={prevStep}
                className="flex-1"
                disabled={loading}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
            )}

            {currentStep < totalSteps ? (
              <Button
                onClick={nextStep}
                className="flex-1"
                disabled={!isStepValid() || loading}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                className="flex-1"
                disabled={loading}
              >
                {loading ? "Guardando..." : "Completar"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
