# Sistema visual de Eaty ("Fresh")

Guía corta para que todas las pantallas se vean como una sola app. Los tokens viven
en [`app/globals.css`](../app/globals.css).

## Color

| Token | Uso |
|---|---|
| `primary` (verde esmeralda) | Acción principal, estado activo, progreso. Uno por pantalla como mucho en botones sólidos. |
| `accent` (lima suave) | Chips/etiquetas destacadas (dieta activa, badges). |
| `protein` / `carbs` / `fat` | **Siempre** proteína = coral, carbohidratos = ámbar, grasa = azul cielo. Puntos, barras y textos de macros. |
| `water` | Hidratación. |
| `success` / `warning` / `destructive` | Estados. `warning` para "por encima de la meta". |
| `muted` / `muted-foreground` | Fondos secundarios (stat chips `bg-muted/60`), texto secundario. |

No usar colores de Tailwind sueltos (`orange-500`, `emerald-500`, `amber-500`…) ni degradados de texto.
Opacidades: `bg-primary/10` o `/12` para fondos de icono.

## Tipografía

- Títulos (`h1`–`h3`) usan Bricolage Grotesque automáticamente. Número grande: `font-display font-bold tabular`.
- Texto: Geist. Etiquetas: `text-xs text-muted-foreground` (o la clase `.eyebrow`). Sin `uppercase tracking-[0.2em]`, sin `font-black`, sin `text-[9px]/[10px]`.
- Pesos: `font-semibold` para títulos de tarjeta, `font-medium` para labels; `font-bold` solo en H1 y cifras.
- Números: clase `tabular`.

## Superficies

- Tarjeta estándar: clase `.surface` (rounded-2xl, borde, sombra suave) + `p-5 sm:p-6`.
- Sub-bloques dentro de tarjeta: `rounded-xl bg-muted/60 px-3 py-2.5`.
- Radios: `rounded-2xl` tarjetas, `rounded-xl` elementos internos/inputs, `rounded-full` botones y chips.
- No usar `rounded-[2rem]`, `rounded-[2.5rem]`, `shadow-2xl`, `backdrop-blur` en tarjetas normales, ni `border-border/40`.

## Componentes

- Botones: `rounded-full`; primario sólido para la acción principal, `variant="outline"` o `ghost` para secundarias. Altura `h-10`/`h-11`.
- Cabecera de página: `PageHeader` ([components/app/page-header.tsx](../components/app/page-header.tsx)).
- Iconos: solo `lucide-react`, nunca emojis. Icono en "pastilla": `flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary`.
- Imágenes de comida: `MealThumb` ([components/meal/meal-thumb.tsx](../components/meal/meal-thumb.tsx)), que tiene esqueleto y respaldo.
- Imagen IA de un plato: `GenerateDishImage` o URLs de `buildDishImageUrl` (pasan por `/api/dish-image`).
- Estados vacíos: `rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center` con icono, título y una acción.
- Cargando: esqueletos `animate-pulse rounded-xl bg-muted`.

## Movimiento

Entradas sutiles con framer-motion (`opacity 0→1`, `y 8–12px→0`, 0.3–0.45 s, ease `[0.22,1,0.36,1]`).
Nada de `whileHover={{ scale }}` en tarjetas ni rebotes. Se respeta `prefers-reduced-motion`.

## Layout

- Contenedor: `mx-auto max-w-6xl px-4 sm:px-6 lg:px-10` (o `max-w-4xl` en pantallas de lectura/formularios).
- En móvil hay barra inferior flotante: deja `pb-32 md:pb-12` al final de cada pantalla.
- Texto en español, tono directo y breve.
