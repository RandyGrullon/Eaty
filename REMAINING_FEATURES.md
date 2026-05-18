# 🚀 Hoja de Ruta Eaty: Pendientes (17/50)

Hemos avanzado significativamente en la implementación de las 50 mejoras. Aquí tienes el listado de lo que queda pendiente para continuar mañana, segmentado por categorías.

## 🟢 Progreso Actual: 33 / 50 Completadas

---

### 1. UX e Interfaz Avanzada (Pendientes: 0)
- [x] **#7 Drag & Drop de Imágenes:** Permitir arrastrar fotos directamente al navegador en la versión de escritorio.
- [x] **#10 Estados de Error Ilustrados:** Crear componentes visuales amigables con ilustraciones para fallos de cámara o red (reemplazando textos).

### 2. Nutrición e Inteligencia Especializada (Pendientes: 3)
- [ ] **#12 Estimación por Referencia:** Pedir al usuario que incluya un objeto común (moneda/mano) para que la IA calcule mejor el tamaño de las porciones.
- [ ] **#16 Integración con Salud:** Conexión con Apple HealthKit o Google Fit para sincronizar pasos y calorías quemadas.
- [x] **#17 Planificador Semanal:** Una vista de calendario para que el usuario registre lo que planea comer a futuro.
- [x] **#20 Metas Basadas en Actividad:** Ajustar el TDEE automáticamente según el nivel de actividad física diaria reportado.

### 3. Rendimiento y Optimización Extrema (Pendientes: 6)
- [x] **#22 Actualizaciones Optimistas:** Implementar SWR o React Query para que los cambios en la UI sean instantáneos antes de confirmar con Firestore.
- [x] **#23 Caché Estratégica para IA:** No repetir análisis de IA para platos idénticos escaneados en cortos periodos de tiempo.
- [ ] **#24 Edge Functions:** Mover el análisis de Groq a Vercel Edge Functions para reducir la latencia de respuesta.
- [ ] **#25 Indexación de Firestore:** Crear índices compuestos para asegurar que las consultas del historial no se degraden con el tiempo.
- [ ] **#26 Lazy Loading de Tab Panels:** Cargar el contenido de las pestañas (Tips, Perfil, Historial) solo cuando el usuario haga clic en ellas.
- [x] **#27 Estrategia Offline Robusta:** Uso de `IndexedDB` (vía Workbox) para permitir escaneos y guardados locales sin conexión que se sincronicen al volver.
- [ ] **#28 Logs de Error Centralizados:** Implementar Sentry para detectar fallos silenciosos en producción.
- [ ] **#30 Tree Shaking de UI:** Auditoría de componentes para asegurar que solo se descarguen las partes de shadcn/ui que realmente usamos.

### 4. Retención y Social Pro (Pendientes: 5)
- [ ] **#33 Reporte Semanal por Email:** Envío automático de resúmenes de progreso visuales (usando Firebase Functions + Resend).
- [ ] **#34 Desafíos de Comunidad:** Retos temporales (ej: "Semana sin Azúcar") con visualización de progreso global.
- [ ] **#36 Recordatorios Push:** Notificaciones al móvil si el usuario olvida registrar sus comidas principales.
- [x] **#38 Sistema de Puntos:** Gamificación avanzada donde se ganan puntos por consistencia para desbloquear temas premium.
- [ ] **#39 Widgets PWA:** Implementar accesos directos o visualización de calorías restantes en la pantalla de inicio del dispositivo.

### 5. Seguridad, Privacidad y Estándares (Pendientes: 7)
- [ ] **#41 Navegación por Teclado:** Asegurar que toda la app sea 100% navegable mediante `Tab` y `Enter`.
- [ ] **#42 Contraste WCAG:** Verificación de paletas de colores para cumplir con los estándares de legibilidad AA/AAA.
- [x] **#44 Exportación GDPR:** Botón en el perfil para descargar toda la información del usuario en un paquete ZIP con JSON y fotos.
- [x] **#45 Eliminación Total de Cuenta:** Proceso automatizado para borrar perfil, comidas y fotos de Storage de forma definitiva.
- [ ] **#46 Autenticación Biométrica:** Integrar WebAuthn para permitir login con FaceID o Huella dactilar.
- [ ] **#48 Cifrado de Datos Sensibles:** Implementar cifrado en el cliente para campos específicos del perfil del usuario.
- [ ] **#50 Diccionario de IA Localizado:** Soporte i18n completo para que la IA responda y analice en el idioma preferido del usuario.

---

**Nota:** He guardado este archivo como `REMAINING_FEATURES.md` en la raíz del proyecto para que podamos retomarlo mañana fácilmente. ¡Buen trabajo hoy! 🚀