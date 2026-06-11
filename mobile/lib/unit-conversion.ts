/** Conversión de unidades de peso/altura y formateo para mostrar. */

export function convertWeight(
  value: number,
  fromUnit: string,
  toUnit: string
): number {
  if (fromUnit === toUnit) return value;
  if (fromUnit === "kg" && toUnit === "lbs")
    return Math.round(value * 2.20462 * 10) / 10;
  if (fromUnit === "lbs" && toUnit === "kg")
    return Math.round((value / 2.20462) * 10) / 10;
  return value;
}

export function convertHeight(
  value: number,
  fromUnit: string,
  toUnit: string
): number {
  if (fromUnit === toUnit) return value;
  if (fromUnit === "cm" && toUnit === "inches")
    return Math.round((value / 2.54) * 10) / 10;
  if (fromUnit === "inches" && toUnit === "cm")
    return Math.round(value * 2.54 * 10) / 10;
  return value;
}

/** Altura en cm -> "5'9\" (175cm)". */
export function formatHeightDisplay(heightCm: number): string {
  if (heightCm <= 0) return "No especificada";

  const inches = Math.round(heightCm / 2.54);
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;

  return `${feet}'${remainingInches}" (${heightCm}cm)`;
}

/** Peso en kg -> "70kg (154lbs)". */
export function formatWeightDisplay(weightKg: number): string {
  if (weightKg <= 0) return "No especificado";

  const lbs = Math.round(weightKg * 2.20462);
  return `${weightKg}kg (${lbs}lbs)`;
}
