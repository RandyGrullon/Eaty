/**
 * Enlaces externos para ideas de recetas (no afiliación; búsquedas genéricas).
 */
export type RecipeSearchLinks = {
  googleRecipes: string;
  youtubeHowTo: string;
};

export function buildRecipeSearchLinks(
  recipeSearchQuery: string
): RecipeSearchLinks {
  const q = recipeSearchQuery.trim();
  const recipes = `${q} receta saludable casera`;
  const video = `${q} receta paso a paso`;
  return {
    googleRecipes: `https://www.google.com/search?q=${encodeURIComponent(recipes)}`,
    youtubeHowTo: `https://www.youtube.com/results?search_query=${encodeURIComponent(video)}`,
  };
}
