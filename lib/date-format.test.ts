import { describe, it, expect } from "vitest";
import { toDateInputValue, fromDateInputValue } from "./date-format";

describe("toDateInputValue", () => {
  it("formatea como YYYY-MM-DD en hora local con padding", () => {
    expect(toDateInputValue(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toDateInputValue(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("fromDateInputValue", () => {
  it("parsea a una fecha local al mediodía (estable frente a DST)", () => {
    const d = fromDateInputValue("2026-06-04");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(4);
    expect(d.getHours()).toBe(12);
  });

  it("es el inverso de toDateInputValue para el componente de fecha", () => {
    const original = new Date(2026, 2, 15);
    expect(toDateInputValue(fromDateInputValue(toDateInputValue(original)))).toBe(
      "2026-03-15"
    );
  });
});
