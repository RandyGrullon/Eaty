# Diet Builder: dieta a partir de tus alimentos

El usuario elige los alimentos que va a comer, su meta (libras a perder y en cuántos
días) y su protocolo de comidas. Eaty calcula metas diarias y arma 7 días de menú con
gramos exactos, macros y un tutorial de preparación por plato. Todo con alimentos de
su lista, sin IA y de forma determinista: funciona igual en el modo demo y sin conexión.

Entrada en la app: **Dietas → "Dieta con mis alimentos"**.

## Arquitectura

```
lib/diet-builder/
  types.ts      Esquemas Zod y tipos: AllowedIngredient, BodyMetrics, DietGoalInput,
                DietTargets, Recipe, PlannedMeal, DayPlan, DietPlan
  catalog.ts    ~45 alimentos (por 100 g en crudo, USDA aprox.) con medida casera,
                porciones razonables, comidas en que encajan y perfil de cocción
  targets.ts    BMR, TDEE, déficit con topes de seguridad y reparto de macros
  solver.ts     Reparto de gramos: mínimos cuadrados con límites (descenso por coordenadas)
  recipes.ts    Nombre del plato, medidas caseras, pasos, sazón y trucos anti-calorías ocultas
  planner.ts    DietPlannerService: compone y resuelve cada comida de cada día
  to-diet.ts    Convierte el plan en una `Diet` de Eaty (guardable y activable)
components/diet-builder/
  diet-builder.tsx       Asistente de 4 pasos (alimentos, objetivo, protocolo, plan)
  ingredient-picker.tsx  Selector con búsqueda, categorías y alimentos propios
  recipe-detail.tsx      Receta: macros, ingredientes en gramos, pasos, sazón y avisos
```

El plan se guarda como una `Diet` normal (`users/{uid}/diets`): cada plato lleva `day`,
`mealLabel`, `time`, `portions` y un `tutorial`; la dieta lleva `plan` (meta, déficit,
protocolo). Al activarla, sus kcal y macros pasan a ser las metas del panel, y
"Añadir al plan" reparte los platos en los próximos días a su hora.

## Cálculo de metas (`targets.ts`)

| Paso | Regla |
|---|---|
| Masa magra | % de grasa → `peso × (1 − %)`; si no, masa muscular esquelética ÷ 0,56; si no, fórmula de Boer |
| BMR | Medido (báscula/calorimetría) › Katch-McArdle (`370 + 21,6 × masa magra`) si hay composición › Mifflin-St Jeor |
| TDEE | BMR × factor de actividad (1,2 – 1,9) |
| Déficit pedido | `libras × 3500 / días` |
| Topes | Máx. 1 % del peso corporal por semana y mínimo de 1500 kcal (hombre) / 1200 (mujer). Si la meta no cabe, se limita y se avisa con los días reales |
| Proteína | 2,2 g por kg de masa magra (mín. 90 g) |
| Grasa / carbos | Sin fuentes de carbohidrato elegidas → **low-carb**: 35 g netos (verduras) y la grasa completa la energía. Con carbohidratos → grasa 30 % (mín. 0,6 g/kg) y el resto carbohidratos |

## Motor (`planner.ts` + `solver.ts`)

1. Reparte las kcal por comida: 16/8 → 50/50 · 3 comidas → 30/40/30 · 4 comidas → 25/35/15/25.
2. Compone cada comida solo con alimentos permitidos y aptos para ese momento
   (desayuno/principal/snack), rotando a lo largo de la semana:
   proteína protagonista (carne o pescado en comidas principales, sin repetir en el día),
   verduras (1–2), carbohidrato si el estilo es equilibrado, y una grasa.
   Si la proteína principal no alcanza la meta con una porción razonable, se añade una
   segunda (huevo como acompañante, una vez al día).
3. Fija las verduras (~160 g, escaladas por tamaño de comida) y resuelve los gramos del
   resto minimizando `Σ peso × (macro − meta)²` sobre proteína, grasa, carbohidratos netos y
   kcal, con cada alimento entre su porción mínima y máxima. Redondea a pasos de 5–10 g
   (o a huevos enteros).
4. Genera la receta: nombre ("Vacío de res a la plancha con brócoli al vapor"),
   ingredientes con gramos, medida casera ("≈ 3 huevos grandes") y macros por ingrediente,
   pasos con fuego/temperatura/minutos y punto interno seguro, sazón de ~0 kcal y trucos
   contra calorías ocultas.
5. Valida el plan: si la media diaria se aleja >8 % de la meta o falta proteína, avisa qué
   alimento añadir.

## Ejemplo práctico

Hombre, 95 kg, 178 cm, 34 años, actividad moderada, 28 % de grasa, 38 kg de masa muscular.
Meta: bajar 17 lb en 51 días con ayuno 16/8. Alimentos: res molida 85/15, vacío de res,
salmón, brócoli, huevos y mantequilla.

- Masa magra 68,4 kg → BMR 1847 kcal (Katch-McArdle) → TDEE 2864 kcal.
- 17 lb en 51 días piden 1167 kcal/día de déficit; el tope (1 % del peso/semana) es 1047:
  **1820 kcal/día**, 2,1 lb/semana, meta en ~57 días (la app lo avisa).
- Macros: **150 g proteína · 120 g grasa · 35 g carbohidratos netos** (low-carb).

Día 1 que genera el motor:

| Comida | Plato | Gramos | kcal | P | G | C |
|---|---|---|---|---|---|---|
| 13:00 | Res molida salteada con huevos y brócoli al vapor | 280 g res · 150 g huevos (3) · 5 g mantequilla · 220 g brócoli | 927 | 77 | 61 | 10 |
| 20:00 | Vacío de res a la plancha con brócoli al vapor | 330 g vacío · 40 g mantequilla · 220 g brócoli | 873 | 76 | 57 | 9 |
| **Total** | | | **1800** | **153** | **118** | **19** |

Uso programático:

```ts
import { generateDietPlan, getCatalogIngredient, planToNewDiet } from "@/lib/diet-builder";

const foods = ["beef-ground-85", "beef-flank", "salmon", "broccoli", "eggs", "butter"]
  .map((id) => getCatalogIngredient(id)!);

const plan = generateDietPlan(
  foods,
  { weightKg: 95, heightCm: 178, age: 34, sex: "male", activityLevel: "moderate", bodyFatPct: 28 },
  { lossLbs: 17, durationDays: 51, protocol: "if_16_8" }
);

plan.targets;              // kcal, macros, déficit, avisos
plan.days[0].meals[0];     // receta con gramos, macros y pasos
await createDiet(planToNewDiet(plan)); // guardar como dieta de Eaty
```

Tests: `lib/diet-builder/planner.test.ts` (catálogo coherente, BMR, topes de déficit, solver,
plan de 7 días a ±8 % de kcal y ≥92 % de proteína, rotación, recetas completas).

> Las cifras son estimaciones orientativas y no sustituyen el consejo de un profesional.
