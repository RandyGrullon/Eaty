/**
 * Barrel de los módulos de meals. Antes todo vivía en `lib/meals.ts` (679 líneas);
 * se dividió por dominio (comidas, stats, perfil, gamificación, cuenta) manteniendo
 * esta superficie pública estable para los ~14 call sites que importan `@/lib/meals`.
 */
export * from "./meals";
export * from "./stats";
export * from "./profile";
export * from "./gamification";
export * from "./account";
