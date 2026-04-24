# Entorno y despliegue (Eaty)

## Variables

Copia `.env.example` a `.env` o `.env.local` y rellena **todas** las `NEXT_PUBLIC_FIREBASE_*` (obligatorias: el arranque falla con un mensaje explícito si falta alguna). En Vercel, define las mismas variables en **Settings > Environment Variables**.

- **NEXT_PUBLIC_FIREBASE_***: SDK web; sin valores reales, `lib/firebase.ts` no inicializa.
- **FIREBASE_SERVICE_ACCOUNT_JSON**: cadena JSON completa de la cuenta de servicio (una sola línea o escapada). Se usa solo en Node para `verifyIdToken` y escritura de cuotas en Firestore con Admin SDK.
- **GROQ_API_KEY**: clave de Groq en el servidor.
- **DAILY_ANALYZE_LIMIT** / **DAILY_TIPS_LIMIT**: límites diarios por `uid` (día UTC) para análisis de comida con **éxito** (los fallos o reintentos no cuentan) y generación de consejos.
- **Firebase Storage** (mismo proyecto): habilítalo en consola; despliega `storage.rules` (`firebase deploy --only storage` o pégalo en la consola) para `users/{uid}/meals/{mealId}/…`, donde se guarda la foto al añadir una comida al historial tras un análisis con imagen.

## Reglas Firestore (consola o CLI)

Reglas mínimas recomendadas (ajusta colecciones si añades más rutas):

- Bajo `users/{userId}/meals`, `users/{userId}/profile`, etc.: lectura y escritura solo si `request.auth != null` y `request.auth.uid == userId`.
- Bajo `users/{userId}/usage/{docId}`: el cliente puede **leer** su propio uso; la **escritura** la hace solo el servidor (Admin). Por tanto `allow write: if false` en esa ruta.

El archivo [firestore.rules](../firestore.rules) del repo refleja esta política para despliegue con Firebase CLI.

## Imágenes en comidas

Tras un análisis con foto, al guardar en el historial se sube la imagen a **Firebase Storage** (`users/{uid}/meals/{mealId}/photo…`) y se persiste `imageUrl` en Firestore.
