import { describe, it, expect } from "vitest";
import { buildMealDocFields, dataUrlToFile, isDataUrl } from "./meal-doc";

const base = {
  imageUrl: null,
  foodName: "Arroz",
  calories: 200,
  macros: { protein: 4, carbs: 44, fat: 1, fiber: 1, sugar: 0 },
  recommendations: [],
};

describe("buildMealDocFields", () => {
  it("descarta campos extra y undefined", () => {
    const out = buildMealDocFields({
      ...base,
      aiContext: undefined,
      // campos que llegan desde la UI y no son del documento
      ...({ recordedAt: undefined, plannedDate: new Date() } as object),
    });
    expect(out).not.toHaveProperty("recordedAt");
    expect(out).not.toHaveProperty("plannedDate");
    expect(out).not.toHaveProperty("aiContext");
    expect(out.isPlanned).toBe(false);
  });

  it("nunca persiste data URLs pero sí URLs http", () => {
    expect(
      buildMealDocFields({ ...base, imageUrl: "data:image/png;base64,AAAA" }).imageUrl
    ).toBeNull();
    expect(
      buildMealDocFields({ ...base, imageUrl: "https://x.test/a.jpg" }).imageUrl
    ).toBe("https://x.test/a.jpg");
  });
});

describe("dataUrlToFile", () => {
  it("convierte base64 a File con el tipo correcto", async () => {
    const f = dataUrlToFile("data:image/png;base64,aGVsbG8=");
    expect(f).not.toBeNull();
    expect(f!.type).toBe("image/png");
    expect(f!.name).toBe("photo.png");
    expect(await f!.text()).toBe("hello");
  });
  it("devuelve null si no es base64", () => {
    expect(dataUrlToFile("data:text/plain,hola")).toBeNull();
    expect(isDataUrl("https://x")).toBe(false);
  });
});
