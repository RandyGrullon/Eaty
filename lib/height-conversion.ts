/** Conversión entre pulgadas totales y pies+pulgadas. */

export function inchesToFeetAndInches(totalInches: number): {
  feet: number;
  inches: number;
} {
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

export function feetAndInchesToInches(feet: number, inches: number): number {
  return feet * 12 + inches;
}
