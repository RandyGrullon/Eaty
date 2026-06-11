# Eaty Mobile (React Native + Expo)

App móvil de Eaty (iOS + Android). Reutiliza el **mismo Firebase** que la web y
el **backend Next.js existente** (las API routes ya aceptan `Authorization: Bearer <idToken>`),
así que las comidas registradas aquí aparecen en la web y viceversa.

## Stack

- **Expo SDK 56** (React Native 0.85, React 19) con **Expo Router** (rutas en `app/`)
- **Firebase JS SDK**: Auth (persistencia AsyncStorage), Firestore en vivo (`onSnapshot`), Storage
- **RevenueCat** (`react-native-purchases`) para suscripciones in-app
- Lógica compartida portada de la web en `lib/` (TDEE, esquemas de análisis, fechas, derivación de stats)

## Desarrollo

1. `npm install` (hay `.npmrc` con `legacy-peer-deps`; npm, no pnpm, en esta carpeta)
2. Copia `.env.example` a `.env` y completa:
   - `EXPO_PUBLIC_FIREBASE_*`: mismos valores que `NEXT_PUBLIC_FIREBASE_*` de la web.
   - `EXPO_PUBLIC_API_BASE_URL`: URL del backend. En dev, la IP LAN de tu PC con la web corriendo (`http://192.168.x.x:3000`); en producción, el dominio de Vercel.
   - `EXPO_PUBLIC_REVENUECAT_*`: API keys públicas de RevenueCat (opcionales en dev).
3. `npx expo start` y abre con **Expo Go** en el teléfono.

> **Expo Go no incluye el módulo nativo de RevenueCat**: la app lo detecta y
> corre en modo free (sin paywall). Para probar compras necesitas un
> **development build**: `npx expo run:android` o EAS (abajo).

## Suscripciones (cómo activar el cobro)

El flujo completo ya está implementado; falta solo la configuración de cuentas:

1. **Cuentas de developer**: Google Play Console ($25 una vez) y Apple Developer ($99/año).
2. **RevenueCat** (gratis hasta $2,500/mes de ingresos):
   - Crea el proyecto y las apps iOS/Android (`com.eaty.app`).
   - Crea los productos de suscripción en App Store Connect / Play Console y mapéalos en RevenueCat.
   - Crea el entitlement **`premium`** y un offering **`default`** con paquetes `MONTHLY` y `ANNUAL`.
   - Copia las API keys públicas a `.env`.
3. **Webhook** (sincroniza premium al backend): en RevenueCat > Integrations > Webhooks:
   - URL: `https://<dominio-web>/api/revenuecat/webhook`
   - Authorization header: el mismo valor que pongas en `REVENUECAT_WEBHOOK_AUTH` del `.env` de la web.
   - El webhook escribe `users/{uid}/billing/subscription` y `enforceDailyQuota`
     aplica límites free (`FREE_DAILY_ANALYZE_LIMIT=5`) vs premium (`DAILY_ANALYZE_LIMIT=120`).
4. **Builds para las stores** con EAS:
   ```bash
   npm install -g eas-cli
   eas login
   eas build:configure
   eas build --platform android   # .aab para Play Console
   eas build --platform ios       # necesita la cuenta de Apple
   ```

### Modelo free / premium

| | Free | Premium |
|---|---|---|
| Análisis IA de comidas | 5/día | 120/día (en la práctica, ilimitado) |
| Consejos IA | 5/día | 40/día |
| Historial y perfil/TDEE | ✅ | ✅ |
| Dietas IA, coach, planner avanzado | ❌ (próximas fases) | ✅ |

Precios sugeridos (configurables en las stores sin tocar código):
**$4.99/mes** y **$29.99/año** (≈$2.50/mes, badge "Mejor precio"), con 7 días de
prueba gratis en el anual. Referencias: Cal AI ≈$10/mes, MyFitnessPal Premium
$19.99/mes, Yazio ≈$35/año. El costo variable por usuario (Groq + Firebase) es
de centavos, el margen está en retención.

## Estructura

```
app/            Rutas (Expo Router)
  (auth)/       login, register
  (tabs)/       index (hoy), scan, history, profile
  paywall.tsx   Modal de suscripción
components/     UI compartida (ui.tsx, meal-card.tsx)
hooks/          use-auth, use-app-data, use-subscription
lib/            Firebase, API client, lógica portada de la web
types/          Tipos compartidos (Meal, UserProfile)
```

## Pendiente (fases siguientes)

- Onboarding guiado al primer arranque (hoy: el perfil se completa en la pestaña Perfil)
- Dietas IA, coach y planner semanal (los endpoints ya existen en el backend)
- Notificaciones push (expo-notifications) y widgets
- Modo offline con cola de sincronización
- Escaneo de código de barras (expo-camera ya lo soporta)
