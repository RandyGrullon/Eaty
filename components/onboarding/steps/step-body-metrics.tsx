"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type {
  OnboardingData,
  UpdateOnboardingField,
} from "../onboarding-types";
import { StepHeader } from "../option-card";

interface StepBodyMetricsProps {
  data: OnboardingData;
  updateData: UpdateOnboardingField;
  onUnitSwitch: (checked: boolean) => void;
  onFeetChange: (feet: string) => void;
  onInchesChange: (inches: string) => void;
  formatHeightDisplay: () => string;
}

export function StepBodyMetrics({
  data,
  updateData,
  onUnitSwitch,
  onFeetChange,
  onInchesChange,
  formatHeightDisplay,
}: StepBodyMetricsProps) {
  return (
    <div>
      <StepHeader
        title="Peso y altura"
        description="Con estos datos calculamos tu metabolismo basal."
      />

      <div className="space-y-8">
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <div>
            <Label className="text-base font-medium">Sistema de Unidades</Label>
            <p className="text-sm text-muted-foreground">
              Elige tu sistema de preferencia
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`text-sm ${data.weightUnit === "kg" ? "font-medium text-primary" : "text-muted-foreground"}`}>
              Métrico
            </span>
            <Switch
              checked={data.weightUnit === "lbs"}
              onCheckedChange={onUnitSwitch}
            />
            <span className={`text-sm ${data.weightUnit === "lbs" ? "font-medium text-primary" : "text-muted-foreground"}`}>
              Imperial
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Peso</Label>
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-sm tabular">
              {data.weight || "0"} {data.weightUnit}
            </Badge>
          </div>
          <div className="relative">
            <Input
              type="number"
              placeholder={data.weightUnit === "kg" ? "Ej: 70" : "Ej: 154"}
              value={data.weight}
              onChange={(e) => updateData("weight", e.target.value)}
              min={data.weightUnit === "kg" ? "30" : "66"}
              max={data.weightUnit === "kg" ? "300" : "661"}
              step="0.1"
              className="h-12 rounded-xl pr-16 text-lg"
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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Altura</Label>
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-sm tabular">
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
                className="h-12 rounded-xl pr-16 text-lg"
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
                  onChange={(e) => onFeetChange(e.target.value)}
                  min="3"
                  max="8"
                  className="h-12 rounded-xl pr-8 text-lg"
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
                  onChange={(e) => onInchesChange(e.target.value)}
                  min="0"
                  max="11"
                  className="h-12 rounded-xl pr-8 text-lg"
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
}
