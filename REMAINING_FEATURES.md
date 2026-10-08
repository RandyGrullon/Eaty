# Eaty: hoja de ruta

Estado real de las funcionalidades. "Pendiente" significa que no existe todavía o
que en la UI solo aparece como "Próximamente".

## Hecho

- Análisis de comida por foto y por texto con IA (Groq), en el idioma del perfil.
- Caché en memoria de análisis por texto (misma sesión, 1 h).
- Fotos de comidas en Firebase Storage (nunca en base64 dentro de Firestore).
- Datos en tiempo real (perfil, comidas, dietas, rutinas, hidratación) vía `onSnapshot`.
- Metas de calorías y macros según TDEE, nivel de actividad y dieta activa.
- Planificador semanal (comidas planificadas, excluidas de estadísticas y logros).
- Dietas y coach de IA (chat, insights del día, rutinas), con cuotas diarias
  separadas por tipo (análisis, consejos, coach, dietas) y plan free/premium.
- Guardado offline en IndexedDB con sincronización al volver la conexión.
- Puntos, niveles, rachas y logros básicos.
- Exportación GDPR (ZIP con JSON y fotos).
- Eliminación de cuenta en el servidor: Firestore, fotos de Storage y usuario de Auth.
- PWA: manifest con accesos directos (escanear, historial, dietas, planificador) y
  service worker con caché de estáticos y página offline.
- Arrastrar y soltar imágenes en escritorio.
- Peso y altura se guardan como números (se eliminó el "cifrado" en cliente, que no
  protegía nada y rompía los cálculos; los valores antiguos se leen y convierten).

## Pendiente / simulado

- **Apple HealthKit / Google Fit**: sin integración; la tarjeta está deshabilitada ("Próximamente").
- **Biometría (WebAuthn)**: sin implementar; el interruptor está deshabilitado.
- **Resumen semanal por correo**: no hay envío de correos; el interruptor está deshabilitado.
- **Notificaciones push reales**: solo se pide permiso al navegador; falta VAPID,
  guardar la suscripción y un emisor en el servidor.
- **Sentry**: `lib/sentry.ts` solo escribe en consola; falta integrar el SDK real.
- **Edge runtime**: todas las APIs usan `runtime = "nodejs"` (necesitan Firebase Admin).
- **Desafíos de comunidad**: la UI existe pero no hay backend ni progreso global real.
- **Temas desbloqueables con puntos**: los temas están disponibles para todos; los
  puntos aún no desbloquean nada.
