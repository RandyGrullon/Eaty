/**
 * SIMULACIÓN: no hay integración con Sentry. Este objeto solo escribe en la
 * consola del navegador/servidor; ningún error se envía a un servicio externo.
 * Para tener monitoreo real hay que instalar `@sentry/nextjs` y reemplazar esto.
 */

export const SentryMock = {
  captureException: (error: unknown, context?: Record<string, any>) => {
    console.group("[errores] captura");
    console.error("Error:", error);
    if (context) console.log("Context:", context);
    console.groupEnd();
    
    // Pendiente: Sentry.captureException() real (ver REMAINING_FEATURES.md).
  },
  captureMessage: (message: string, level: "info" | "warning" | "error" = "info") => {
    console.log(`[errores ${level}] ${message}`);
  }
};
