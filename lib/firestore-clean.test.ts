import { describe, it, expect } from "vitest";
import { stripUndefined } from "./firestore-clean";

describe("stripUndefined", () => {
  it("elimina claves undefined en profundidad", () => {
    const out = stripUndefined({
      a: 1,
      b: undefined,
      c: { d: undefined, e: "x" },
      f: [{ g: undefined, h: 2 }, undefined],
    });
    expect(out).toEqual({ a: 1, c: { e: "x" }, f: [{ h: 2 }] });
    expect("b" in out).toBe(false);
  });

  it("no altera instancias de clase ni null", () => {
    const date = new Date(0);
    const out = stripUndefined({ date, n: null });
    expect(out.date).toBe(date);
    expect(out.n).toBeNull();
  });
});
