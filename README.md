# Eaty

Asistente nutricional con IA: haz una foto a tu plato (o descríbelo, o escanea el
código de barras) y Eaty estima calorías y macros, los compara con tu meta diaria y
te sugiere qué ajustar.

**En vivo:** https://eaty-umber.vercel.app

## Qué hace

- **Registro por foto, texto o código de barras.** Visión por IA (Groq) con desglose por
  componente, nivel de confianza y porción estimada; Open Food Facts para productos envasados.
- **Meta diaria personalizada.** TDEE con Mifflin-St Jeor según edad, sexo, peso, altura,
  actividad y objetivo; reparto de proteína, carbohidratos y grasa.
- **Panel de hoy.** Anillo de calorías, macros, hidratación, últimos 7 días y racha.
- **Dietas generadas por IA** con recetas paso a paso e imagen IA de cada plato.
- **Coach nutricional** (chat y resumen del día) y rutinas de entrenamiento.
- **Planificador semanal**, historial con filtros y edición de comidas.
- **Cuenta de invitado** que se convierte en cuenta real sin perder datos.
- **PWA** instalable con cola offline para guardar comidas sin conexión.
- Exportación de datos (ZIP) y borrado completo de cuenta.

La **app móvil (iOS/Android)** vive en [`mobile/`](mobile/README.md): Expo + React Native,
mismo Firebase y mismo backend, con suscripciones vía RevenueCat. El módulo de
**entrenos (gym)** está en la PWA **Body Matter**
([repo](https://github.com/RandyGrullon/bodymeter)).

## Stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS 4 · shadcn/ui · Framer Motion ·
Firebase (Auth, Firestore, Storage, Admin SDK) · Groq (Qwen 3.8 vision) · Pollinations (imágenes
de platos) · Zod · Vitest · Vercel.

## Desarrollo

```bash
pnpm install
cp .env.example .env.local   # completa las variables
pnpm dev
```

### Modo demo (sin Firebase ni claves)

```bash
NEXT_PUBLIC_DEMO_MODE=1 pnpm dev
```

Sustituye los SDK de Firebase por implementaciones locales ([`lib/demo/`](lib/demo)) con un
perfil y dos semanas de comidas de ejemplo guardadas en el navegador. Sin `GROQ_API_KEY`, la IA
responde con ejemplos realistas. Útil para probar la app o enseñarla sin credenciales.

## Documentación

- [Entorno, Firebase Admin y reglas Firestore](docs/environment.md)
- [Sistema visual](docs/design-system.md)
- [PWA / offline](docs/pwa-offline.md)
- [Actualización Next.js 15+](docs/next-upgrade.md)
- [Hoja de ruta](REMAINING_FEATURES.md)

## Scripts

- `pnpm dev` — desarrollo
- `pnpm build` — producción
- `pnpm test` — Vitest (lógica en `lib/*.test.ts`)
- `pnpm lint` — ESLint
