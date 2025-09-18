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
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  age: number;
  gender: "male" | "female" | "other";
  weight: string;
  weightUnit: "kg" | "lbs";
  height: string;
  heightFeet: string;
  heightInches: string;
  heightUnit: "cm" | "inches";
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
  fitnessGoal: "bulking" | "shedding" | "maintenance";
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user, logout } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    age: 25,
    gender: "male",
    weight: "",
    weightUnit: "kg",
    height: "",
    heightFeet: "",
    heightInches: "",
    heightUnit: "cm",
    activityLevel: "moderate",
    fitnessGoal: "maintenance",
  });

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  const updateData = (field: keyof OnboardingData, value: string | number) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  // Funciones helper para conversión de altura
  const inchesToFeetAndInches = (totalInches: number) => {
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  };

  const feetAndInchesToInches = (feet: number, inches: number) => {
    return feet * 12 + inches;
  };

  const formatHeightDisplay = () => {
    if (data.heightUnit === "cm") {
      return `${data.height || "0"} cm`;
    } else {
      if (data.heightFeet && data.heightInches) {
        return `${data.heightFeet}'${data.heightInches}"`;
      } else if (data.height) {
        const totalInches = parseFloat(data.height);
        const { feet, inches } = inchesToFeetAndInches(totalInches);
        return `${feet}'${inches}"`;
      }
      return "0'0\"";
    }
  };

  const handleUnitSwitch = (checked: boolean) => {
    const newUnit = checked ? "lbs" : "kg";

    // Convertir peso si hay datos
    if (data.weight && parseFloat(data.weight) > 0) {
      const weightValue = parseFloat(data.weight);
      if (checked && data.weightUnit === "kg") {
        // Convertir kg a lbs
        const lbsValue = Math.round(weightValue * 2.20462 * 10) / 10;
        updateData("weight", lbsValue.toString());
      } else if (!checked && data.weightUnit === "lbs") {
        // Convertir lbs a kg
        const kgValue = Math.round(weightValue * 0.453592 * 10) / 10;
        updateData("weight", kgValue.toString());
      }
    }

    if (checked) {
      // Cambiando a imperial
      if (data.height && data.heightUnit === "cm") {
        const cmValue = parseFloat(data.height);
        const inchesValue = Math.round(cmValue / 2.54);
        const { feet, inches } = inchesToFeetAndInches(inchesValue);
        updateData("heightFeet", feet.toString());
        updateData("heightInches", inches.toString());
        updateData("height", inchesValue.toString());
      }
      // Si ya hay datos en pies/pulgadas, mantenerlos
      if (data.heightFeet && data.heightInches) {
        const totalInches = feetAndInchesToInches(
          parseInt(data.heightFeet) || 0,
          parseInt(data.heightInches) || 0
        );
        updateData("height", totalInches.toString());
      }
    } else {
      // Cambiando a métrico
      let totalInches = 0;

      if (data.heightFeet && data.heightInches) {
        // Si hay datos en pies/pulgadas, convertirlos
        totalInches = feetAndInchesToInches(
          parseInt(data.heightFeet) || 0,
          parseInt(data.heightInches) || 0
        );
      } else if (data.height && data.heightUnit === "inches") {
        // Si hay datos en pulgadas totales, usarlos directamente
        totalInches = parseFloat(data.height);
      }

      if (totalInches > 0) {
        const cmValue = Math.round(totalInches * 2.54);
        updateData("height", cmValue.toString());
      }

      // Limpiar campos de pies/pulgadas
      updateData("heightFeet", "");
      updateData("heightInches", "");
    }

    updateData("weightUnit", newUnit);
    updateData("heightUnit", checked ? "inches" : "cm");
  };
  const handleFeetChange = (feet: string) => {
    const feetNum = parseInt(feet) || 0;
    // Validar que los pies estén en un rango razonable (3-8 pies)
    if (feetNum >= 3 && feetNum <= 8) {
      updateData("heightFeet", feet);
      if (feet && data.heightInches) {
        const totalInches = feetAndInchesToInches(
          feetNum,
          parseInt(data.heightInches) || 0
        );
        updateData("height", totalInches.toString());
      }
    } else if (feet === "") {
      updateData("heightFeet", "");
    }
  };

  const handleInchesChange = (inches: string) => {
    const inchesNum = parseInt(inches) || 0;
    // Validar que las pulgadas estén en un rango razonable (0-11)
    if (inchesNum >= 0 && inchesNum <= 11) {
      updateData("heightInches", inches);
      if (data.heightFeet && inches) {
        const totalInches = feetAndInchesToInches(
          parseInt(data.heightFeet) || 0,
          inchesNum
        );
        updateData("height", totalInches.toString());
      }
    } else if (inches === "") {
      updateData("heightInches", "");
    }
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
          age: data.age,
          gender: data.gender,
          weight: Math.round(weightInKg * 10) / 10, // Redondear a 1 decimal
          height: Math.round(heightInCm * 10) / 10, // Redondear a 1 decimal
          activityLevel: data.activityLevel,
          fitnessGoal: data.fitnessGoal,
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
        return data.age >= 13 && data.age <= 120 && data.gender;
      case 2:
        return (
          data.weight &&
          parseFloat(data.weight) > 0 &&
          data.height &&
          parseFloat(data.height) > 0 &&
          (data.heightUnit === "cm" || (data.heightFeet && data.heightInches))
        );
      case 3:
        return data.activityLevel;
      case 4:
        return data.fitnessGoal;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-primary mb-2">
                Información Personal
              </h2>
              <p className="text-muted-foreground">
                Cuéntanos un poco sobre ti para personalizar tu experiencia
              </p>
            </div>

            <div className="space-y-8">
              {/* Edad con Slider */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Edad</Label>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {data.age} años
                  </Badge>
                </div>
                <div className="px-2">
                  <Slider
                    value={[data.age]}
                    onValueChange={(value) => updateData("age", value[0])}
                    max={120}
                    min={13}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>13</span>
                    <span>120</span>
                  </div>
                </div>
              </div>

              {/* Género */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Género</Label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => updateData("gender", "male")}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      data.gender === "male"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-muted hover:border-primary/50"
                    }`}
                  >
                    <div className="text-2xl mb-2">👨</div>
                    <div className="font-medium">Masculino</div>
                  </button>
                  <button
                    onClick={() => updateData("gender", "female")}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      data.gender === "female"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-muted hover:border-primary/50"
                    }`}
                  >
                    <div className="text-2xl mb-2">👩</div>
                    <div className="font-medium">Femenino</div>
                  </button>
                  <button
                    onClick={() => updateData("gender", "other")}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      data.gender === "other"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-muted hover:border-primary/50"
                    }`}
                  >
                    <div className="text-2xl mb-2">🌟</div>
                    <div className="font-medium">Otro</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-primary mb-2">
                Medidas Corporales
              </h2>
              <p className="text-muted-foreground">
                Necesitamos tus medidas para calcular mejor tus necesidades
                calóricas
              </p>
            </div>

            <div className="space-y-8">
              {/* Sistema de Unidades */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-base font-medium">
                    Sistema de Unidades
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Elige tu sistema de preferencia
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <span
                    className={`text-sm ${
                      data.weightUnit === "kg"
                        ? "font-medium text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    Métrico
                  </span>
                  <Switch
                    checked={data.weightUnit === "lbs"}
                    onCheckedChange={handleUnitSwitch}
                  />
                  <span
                    className={`text-sm ${
                      data.weightUnit === "lbs"
                        ? "font-medium text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    Imperial
                  </span>
                </div>
              </div>

              {/* Peso */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Peso</Label>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {data.weight || "0"} {data.weightUnit}
                  </Badge>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder={
                      data.weightUnit === "kg" ? "Ej: 70" : "Ej: 154"
                    }
                    value={data.weight}
                    onChange={(e) => updateData("weight", e.target.value)}
                    min={data.weightUnit === "kg" ? "30" : "66"}
                    max={data.weightUnit === "kg" ? "300" : "661"}
                    step="0.1"
                    className="text-lg h-12 pr-16"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    {data.weightUnit}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.weightUnit === "kg"
                    ? "Rango recomendado: 30-300 kg"
                    : "Rango recomendado: 66-661 lbs"}
                </p>
              </div>

              {/* Altura */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Altura</Label>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {formatHeightDisplay()}
                  </Badge>
                </div>

                {data.heightUnit === "cm" ? (
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="Ej: 170"
                      value={data.height}
                      onChange={(e) => updateData("height", e.target.value)}
                      min="100"
                      max="250"
                      step="1"
                      className="text-lg h-12 pr-16"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      cm
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        placeholder="5"
                        value={data.heightFeet}
                        onChange={(e) => handleFeetChange(e.target.value)}
                        min="3"
                        max="8"
                        className="text-lg h-12 pr-8"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                        ft
                      </div>
                    </div>
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        placeholder="7"
                        value={data.heightInches}
                        onChange={(e) => handleInchesChange(e.target.value)}
                        min="0"
                        max="11"
                        className="text-lg h-12 pr-8"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                        in
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  {data.heightUnit === "cm"
                    ? "Rango recomendado: 150-200 cm"
                    : "Rango recomendado: 4'11\" - 6'7\""}
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-primary mb-2">
                Nivel de Actividad
              </h2>
              <p className="text-muted-foreground">
                ¿Qué tan activo eres físicamente? Esto nos ayuda a calcular tus
                calorías diarias
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  {
                    value: "sedentary",
                    label: "Sedentario",
                    description: "Poco o ningún ejercicio",
                    icon: "🪑",
                    color: "bg-gray-500",
                  },
                  {
                    value: "light",
                    label: "Ligero",
                    description: "Ejercicio ligero 1-3 días/semana",
                    icon: "🚶",
                    color: "bg-blue-500",
                  },
                  {
                    value: "moderate",
                    label: "Moderado",
                    description: "Ejercicio moderado 3-5 días/semana",
                    icon: "🏃",
                    color: "bg-green-500",
                  },
                  {
                    value: "active",
                    label: "Activo",
                    description: "Ejercicio intenso 6-7 días/semana",
                    icon: "💪",
                    color: "bg-orange-500",
                  },
                  {
                    value: "very_active",
                    label: "Muy Activo",
                    description: "Ejercicio muy intenso o trabajo físico",
                    icon: "🔥",
                    color: "bg-red-500",
                  },
                ].map((activity) => (
                  <button
                    key={activity.value}
                    onClick={() => updateData("activityLevel", activity.value)}
                    className={`w-full p-4 border-2 rounded-xl transition-all text-left ${
                      data.activityLevel === activity.value
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-muted hover:border-primary/50 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl ${activity.color}`}
                      >
                        {activity.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-lg">
                          {activity.label}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {activity.description}
                        </div>
                      </div>
                      {data.activityLevel === activity.value && (
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Target className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">
                Objetivo de Fitness
              </h2>
              <p className="text-muted-foreground">
                ¿Cuál es tu objetivo principal?
              </p>
            </div>

            <div className="space-y-4">
              <RadioGroup
                value={data.fitnessGoal}
                onValueChange={(value) =>
                  updateData(
                    "fitnessGoal",
                    value as OnboardingData["fitnessGoal"]
                  )
                }
              >
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                    <RadioGroupItem
                      value="bulking"
                      id="bulking"
                      className="mt-1"
                    />
                    <div>
                      <Label htmlFor="bulking" className="font-medium">
                        Bulking
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Ganar masa muscular y peso
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                    <RadioGroupItem
                      value="shedding"
                      id="shedding"
                      className="mt-1"
                    />
                    <div>
                      <Label htmlFor="shedding" className="font-medium">
                        Shedding
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Perder peso y grasa corporal
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                    <RadioGroupItem
                      value="maintenance"
                      id="maintenance"
                      className="mt-1"
                    />
                    <div>
                      <Label htmlFor="maintenance" className="font-medium">
                        Mantenimiento
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Mantener el peso actual
                      </p>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 5:
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
                  <span className="font-medium">{formatHeightDisplay()}</span>
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Objetivo:</span>
                  <span className="font-medium">
                    {data.fitnessGoal === "bulking"
                      ? "Bulking"
                      : data.fitnessGoal === "shedding"
                      ? "Shedding"
                      : "Mantenimiento"}
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-card/95 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-6">
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

          {/* Indicadores de pasos visuales */}
          <div className="flex items-center justify-center space-x-2 mb-4">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    step === currentStep
                      ? "bg-primary text-primary-foreground shadow-md"
                      : step < currentStep
                      ? "bg-primary/20 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step < currentStep ? "✓" : step}
                </div>
                {step < totalSteps && (
                  <div
                    className={`w-8 h-0.5 mx-1 transition-colors ${
                      step < currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <Progress value={progress} className="h-2" />
        </CardHeader>{" "}
        <CardContent className="space-y-6 min-h-[400px] transition-all duration-300 ease-in-out">
          <div
            key={currentStep}
            className="animate-in fade-in-0 slide-in-from-right-5 duration-300"
          >
            {renderStep()}
          </div>

          <div className="flex gap-3 pt-6">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={prevStep}
                className="flex-1 h-12 text-base font-medium"
                disabled={loading}
              >
                <ChevronLeft className="h-5 w-5 mr-2" />
                Anterior
              </Button>
            )}

            {currentStep < totalSteps ? (
              <Button
                onClick={nextStep}
                className="flex-1 h-12 text-base font-medium shadow-md"
                disabled={!isStepValid() || loading}
              >
                Siguiente
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                className="flex-1 h-12 text-base font-medium shadow-md bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Settings className="h-5 w-5 mr-2" />
                    Completar Setup
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
