import { describe, it, expect } from "vitest";
import {
  parseMeasure,
  isLegacyEncryptedMeasure,
  normalizeMeasure,
} from "./profile-measure";

describe("parseMeasure", () => {
  it("acepta números positivos y strings numéricos", () => {
    expect(parseMeasure(72.5)).toBe(72.5);
    expect(parseMeasure("180")).toBe(180);
    expect(parseMeasure(" 70,5 ")).toBe(70.5);
  });
  it("rechaza vacíos, ceros, NaN y basura", () => {
    expect(parseMeasure(0)).toBeUndefined();
    expect(parseMeasure(NaN)).toBeUndefined();
    expect(parseMeasure("")).toBeUndefined();
    expect(parseMeasure("abc")).toBeUndefined();
    expect(parseMeasure(null)).toBeUndefined();
  });
});

describe("normalizeMeasure", () => {
  it("descifra valores antiguos y los convierte a número", async () => {
    const cipher = "q1w2e3r4t5y6u7i8o9p0==";
    expect(isLegacyEncryptedMeasure(cipher)).toBe(true);
    await expect(normalizeMeasure(cipher, async () => "81.2")).resolves.toBe(81.2);
  });
  it("si el descifrado falla devuelve undefined", async () => {
    const cipher = "q1w2e3r4t5y6u7i8o9p0==";
    await expect(normalizeMeasure(cipher, async (c) => c)).resolves.toBeUndefined();
    await expect(
      normalizeMeasure(cipher, async () => {
        throw new Error("x");
      })
    ).resolves.toBeUndefined();
  });
  it("no llama a decrypt para números ni strings numéricos", async () => {
    const decrypt = async () => {
      throw new Error("no debería llamarse");
    };
    await expect(normalizeMeasure("175", decrypt)).resolves.toBe(175);
    await expect(normalizeMeasure(60, decrypt)).resolves.toBe(60);
  });
});
