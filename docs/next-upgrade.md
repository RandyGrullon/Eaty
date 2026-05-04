# Actualización Next.js 15+

Hoy el proyecto usa **Next 14.2.x** (App Router). Para subir a Next 15+:

1. Revisar el [guía oficial de upgrade](https://nextjs.org/docs/app/building-your-application/upgrading) y notas de breaking changes (fetch caching, `params`/`searchParams` en layouts, etc.).
2. Ejecutar en una rama: `pnpm add next@latest react@latest react-dom@latest` y resolver conflictos de tipos.
3. Pasar `pnpm exec tsc --noEmit`, `pnpm lint` y `pnpm build`; corregir avisos de deprecación.
4. Probar manualmente: auth, onboarding, análisis con imagen/texto, historial, perfil y PWA.
