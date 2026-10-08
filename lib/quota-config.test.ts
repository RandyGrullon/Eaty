import { describe, it, expect } from "vitest";
import {
  QUOTA_SPECS,
  dailyQuotaLimit,
  quotaExceededMessage,
  refundedCount,
} from "./quota-config";

describe("dailyQuotaLimit", () => {
  it("usa los valores por defecto de cada tipo", () => {
    const env = {};
    expect(dailyQuotaLimit("coach", false, env)).toBe(15);
    expect(dailyQuotaLimit("coach", true, env)).toBe(200);
    expect(dailyQuotaLimit("diets", false, env)).toBe(5);
    expect(dailyQuotaLimit("diets", true, env)).toBe(40);
    expect(dailyQuotaLimit("analyze", false, env)).toBe(5);
    expect(dailyQuotaLimit("tips", true, env)).toBe(40);
  });

  it("respeta las variables de entorno válidas e ignora las inválidas", () => {
    expect(
      dailyQuotaLimit("coach", false, { FREE_DAILY_COACH_LIMIT: "3" })
    ).toBe(3);
    expect(dailyQuotaLimit("diets", true, { DAILY_DIETS_LIMIT: "abc" })).toBe(40);
    expect(dailyQuotaLimit("diets", true, { DAILY_DIETS_LIMIT: "0" })).toBe(40);
  });

  it("cada tipo tiene su propio contador", () => {
    const fields = Object.values(QUOTA_SPECS).map((s) => s.field);
    expect(new Set(fields).size).toBe(fields.length);
  });
});

describe("refundedCount / mensajes", () => {
  it("no baja de cero", () => {
    expect(refundedCount(3)).toBe(2);
    expect(refundedCount(0)).toBe(0);
    expect(refundedCount(undefined)).toBe(0);
  });
  it("el mensaje menciona el límite", () => {
    expect(quotaExceededMessage("coach", 15, false)).toContain("15");
  });
});
