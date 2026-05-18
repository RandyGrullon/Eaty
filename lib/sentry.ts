/**
 * Mock de integración con Sentry para reporte de errores centralizado.
 * En producción, esto enviaría los errores a un dashboard externo.
 */

export const SentryMock = {
  captureException: (error: unknown, context?: Record<string, any>) => {
    console.group("🚀 Sentry Capture");
    console.error("Error:", error);
    if (context) console.log("Context:", context);
    console.groupEnd();
    
    // Aquí iría la lógica real de Sentry.init() y Sentry.captureException()
  },
  captureMessage: (message: string, level: "info" | "warning" | "error" = "info") => {
    console.log(`[Sentry ${level.toUpperCase()}]: ${message}`);
  }
};
