/**
 * Punto único para logs (sustituible por Sentry/Datadog sin tocar cada call site).
 */
const isDev = process.env.NODE_ENV === "development";

export const logger = {
  error(message: string, meta?: unknown): void {
    if (meta !== undefined) {
      console.error(`[eaty] ${message}`, meta);
      return;
    }
    console.error(`[eaty] ${message}`);
  },
  warn(message: string, meta?: unknown): void {
    if (!isDev) return;
    if (meta !== undefined) {
      console.warn(`[eaty] ${message}`, meta);
      return;
    }
    console.warn(`[eaty] ${message}`);
  },
  info(message: string, meta?: unknown): void {
    if (!isDev) return;
    if (meta !== undefined) {
      console.info(`[eaty] ${message}`, meta);
      return;
    }
    console.info(`[eaty] ${message}`);
  },
};
