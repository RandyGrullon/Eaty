import { describe, it, expect } from "vitest";
import { getCacheKey } from "./groq";

describe("getCacheKey (análisis por texto)", () => {
  it("incluye el idioma en la clave", () => {
    expect(getCacheKey({ foodName: "Arroz", lang: "es" })).not.toBe(
      getCacheKey({ foodName: "Arroz", lang: "en" })
    );
  });

  it("no muta el array de alérgenos y es estable al orden", () => {
    const allergens = ["Nuts", "gluten"];
    const k1 = getCacheKey({ foodName: "pan", allergens });
    expect(allergens).toEqual(["Nuts", "gluten"]);
    expect(k1).toBe(getCacheKey({ foodName: "pan", allergens: ["gluten", "nuts"] }));
  });

  it("no cachea imágenes ni peticiones vacías", () => {
    expect(getCacheKey({ imageBase64: "AAAA", foodName: "x" })).toBeNull();
    expect(getCacheKey({})).toBeNull();
  });

  it("no confunde nombre con descripción", () => {
    expect(getCacheKey({ foodName: "x" })).not.toBe(getCacheKey({ description: "x" }));
  });
});
