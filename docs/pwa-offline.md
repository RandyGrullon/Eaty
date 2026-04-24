# PWA y modo offline

## Estado actual

La app incluye `manifest`, indicador offline e instalación sugerida. Sin un **service worker** propio que cachee datos de Firestore, el modo offline suele limitarse a la **shell** (assets estáticos) y a lo que el navegador ya tenga en caché HTTP.

## Contrato recomendado

- **No prometer** en la UI funciones que requieran red (análisis Groq, login nuevo) cuando `navigator.onLine === false`.
- Si en el futuro se añade SW: definir explícitamente qué rutas y qué datos se cachean y cuánto tiempo; invalidar al cerrar sesión por seguridad.
