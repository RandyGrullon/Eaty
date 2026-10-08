import { describe, it, expect } from "vitest";
import { chunk } from "./chunk";

describe("chunk", () => {
  it("parte en grupos de tamaño máximo", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 450)).toEqual([]);
    const big = Array.from({ length: 1000 }, (_, i) => i);
    const groups = chunk(big, 450);
    expect(groups.map((g) => g.length)).toEqual([450, 450, 100]);
  });
  it("rechaza tamaños inválidos", () => {
    expect(() => chunk([1], 0)).toThrow();
  });
});
