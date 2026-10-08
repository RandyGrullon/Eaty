import { describe, it, expect } from "vitest";
import {
  toDateInputValue,
  fromDateInputValue,
  localDayKey,
  msUntilNextLocalMidnight,
} from "./date-format";

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

describe("localDayKey", () => {
  it("usa el día local, no el día UTC", () => {
    // 00:30 local siempre debe ser el mismo día local, sea cual sea el huso.
    expect(localDayKey(new Date(2026, 2, 10, 0, 30))).toBe("2026-03-10");
    expect(localDayKey(new Date(2026, 2, 10, 23, 59))).toBe("2026-03-10");
  });
});

describe("msUntilNextLocalMidnight", () => {
  it("calcula lo que falta hasta las 00:00 locales del día siguiente", () => {
    const now = new Date(2026, 2, 10, 23, 0, 0, 0);
    const ms = msUntilNextLocalMidnight(now);
    const at = new Date(now.getTime() + ms);
    expect(at.getDate()).toBe(11);
    expect(at.getHours()).toBe(0);
    expect(at.getMinutes()).toBe(0);
  });
});
