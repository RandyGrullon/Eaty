import { describe, it, expect } from "vitest";
import { buildDishPrompt, buildDishImageUrl, generateDishImageUrl } from "./dish-image";

describe("buildDishPrompt", () => {
  it("incluye el nombre del plato", () => {
    const p = buildDishPrompt({ foodName: "Paella valenciana" });
    expect(p).toContain("Paella valenciana");
    expect(p).toContain("food photography");
  });

  it("añade contexto de la IA cuando está disponible", () => {
    const p = buildDishPrompt({
      foodName: "Ensalada",
      aiContext: {
        confidence: "high",
        portionLabel: "1 bol",
        containerType: "bol de cerámica",
        componentBreakdown: [{ name: "lechuga" }, { name: "tomate" }],
      },
    });
    expect(p).toContain("1 bol");
    expect(p).toContain("bol de cerámica");
    expect(p).toContain("lechuga");
    expect(p).toContain("tomate");
  });
});

describe("buildDishImageUrl", () => {
  it("codifica el prompt y añade parámetros", () => {
    const url = buildDishImageUrl("tortilla de patatas", 42);
    expect(url).toContain("https://image.pollinations.ai/prompt/");
    expect(url).toContain("tortilla%20de%20patatas");
    expect(url).toContain("seed=42");
    expect(url).toContain("nologo=true");
  });

  it("genera URLs distintas con semillas distintas", () => {
    expect(buildDishImageUrl("x", 1)).not.toEqual(buildDishImageUrl("x", 2));
  });
});

describe("generateDishImageUrl", () => {
  it("produce una URL válida a partir del meal", () => {
    const url = generateDishImageUrl({ foodName: "Sushi" }, 7);
    expect(url).toContain("Sushi");
    expect(url).toContain("seed=7");
  });
});
