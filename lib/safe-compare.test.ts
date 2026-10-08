import { describe, it, expect } from "vitest";
import { safeEqual } from "./safe-compare";

describe("safeEqual", () => {
  it("compara secretos", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});
