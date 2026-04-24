import { describe, expect, it } from "vitest";
import {
  calculateAgeFromBirthDateString,
  formatDateOnlyLocal,
  parseISODateLocal,
} from "@/lib/age-from-birthdate";

describe("age-from-birthdate", () => {
  it("parseISODateLocal parses valid ISO", () => {
    const d = parseISODateLocal("2000-06-15");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2000);
    expect(d!.getMonth()).toBe(5);
    expect(d!.getDate()).toBe(15);
  });

  it("parseISODateLocal rejects invalid", () => {
    expect(parseISODateLocal("")).toBeNull();
    expect(parseISODateLocal("2000-13-01")).toBeNull();
  });

  it("formatDateOnlyLocal round-trips local date", () => {
    const d = new Date(1995, 2, 8);
    expect(formatDateOnlyLocal(d)).toBe("1995-03-08");
  });

  it("calculateAgeFromBirthDateString matches calendar rules", () => {
    const birth = new Date(2000, 5, 15);
    const iso = formatDateOnlyLocal(birth);
    const today = new Date();
    let expected =
      today.getFullYear() - birth.getFullYear();
    const md = today.getMonth() - birth.getMonth();
    if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) {
      expected--;
    }
    expect(calculateAgeFromBirthDateString(iso)).toBe(expected);
  });
});
