"use client";

import { useState, useCallback } from "react";
import {
  inchesToFeetAndInches,
  feetAndInchesToInches,
} from "@/lib/height-conversion";
import type { OnboardingData } from "@/components/onboarding/onboarding-types";

const INITIAL_DATA: OnboardingData = {
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
};

/**
 * Estado del formulario de onboarding + lógica de conversión de unidades.
 * Antes vivía dentro del componente OnboardingWizard (854 líneas).
 */
export function useOnboardingForm() {
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);

  const updateData = useCallback(
    (field: keyof OnboardingData, value: string | number) => {
      setData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleUnitSwitch = useCallback((checked: boolean) => {
    const newUnit = checked ? "lbs" : "kg";

    setData((prev) => {
      const next: OnboardingData = { ...prev };

      // Convertir peso si hay datos.
      if (prev.weight && parseFloat(prev.weight) > 0) {
        const weightValue = parseFloat(prev.weight);
        if (checked && prev.weightUnit === "kg") {
          next.weight = (Math.round(weightValue * 2.20462 * 10) / 10).toString();
        } else if (!checked && prev.weightUnit === "lbs") {
          next.weight = (Math.round(weightValue * 0.453592 * 10) / 10).toString();
        }
      }

      if (checked) {
        // Cambiando a imperial.
        if (prev.height && prev.heightUnit === "cm") {
          const inchesValue = Math.round(parseFloat(prev.height) / 2.54);
          const { feet, inches } = inchesToFeetAndInches(inchesValue);
          next.heightFeet = feet.toString();
          next.heightInches = inches.toString();
          next.height = inchesValue.toString();
        } else if (prev.heightFeet && prev.heightInches) {
          // Si ya hay datos en pies/pulgadas, mantenerlos.
          const totalInches = feetAndInchesToInches(
            parseInt(prev.heightFeet) || 0,
            parseInt(prev.heightInches) || 0
          );
          next.height = totalInches.toString();
        }
      } else {
        // Cambiando a métrico.
        let totalInches = 0;
        if (prev.heightFeet && prev.heightInches) {
          totalInches = feetAndInchesToInches(
            parseInt(prev.heightFeet) || 0,
            parseInt(prev.heightInches) || 0
          );
        } else if (prev.height && prev.heightUnit === "inches") {
          totalInches = parseFloat(prev.height);
        }
        if (totalInches > 0) {
          next.height = Math.round(totalInches * 2.54).toString();
        }
        next.heightFeet = "";
        next.heightInches = "";
      }

      next.weightUnit = newUnit;
      next.heightUnit = checked ? "inches" : "cm";
      return next;
    });
  }, []);

  const handleFeetChange = useCallback((feet: string) => {
    const feetNum = parseInt(feet) || 0;
    // Rango razonable de pies (3-8).
    if (feetNum >= 3 && feetNum <= 8) {
      setData((prev) => {
        const next = { ...prev, heightFeet: feet };
        if (feet && prev.heightInches) {
          next.height = feetAndInchesToInches(
            feetNum,
            parseInt(prev.heightInches) || 0
          ).toString();
        }
        return next;
      });
    } else if (feet === "") {
      setData((prev) => ({ ...prev, heightFeet: "" }));
    }
  }, []);

  const handleInchesChange = useCallback((inches: string) => {
    const inchesNum = parseInt(inches) || 0;
    // Rango razonable de pulgadas (0-11).
    if (inchesNum >= 0 && inchesNum <= 11) {
      setData((prev) => {
        const next = { ...prev, heightInches: inches };
        if (prev.heightFeet && inches) {
          next.height = feetAndInchesToInches(
            parseInt(prev.heightFeet) || 0,
            inchesNum
          ).toString();
        }
        return next;
      });
    } else if (inches === "") {
      setData((prev) => ({ ...prev, heightInches: "" }));
    }
  }, []);

  const formatHeightDisplay = useCallback((): string => {
    if (data.heightUnit === "cm") {
      return `${data.height || "0"} cm`;
    }
    if (data.heightFeet && data.heightInches) {
      return `${data.heightFeet}'${data.heightInches}"`;
    }
    if (data.height) {
      const { feet, inches } = inchesToFeetAndInches(parseFloat(data.height));
      return `${feet}'${inches}"`;
    }
    return "0'0\"";
  }, [data.heightUnit, data.height, data.heightFeet, data.heightInches]);

  return {
    data,
    updateData,
    handleUnitSwitch,
    handleFeetChange,
    handleInchesChange,
    formatHeightDisplay,
  };
}
