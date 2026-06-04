/**
 * Formateo de fechas en español, centralizado.
 * Antes estaba duplicado en meal-history, analysis-results, meal-detail-modal,
 * meal-calendar y dashboard-screen.
 */

/** Hora local "HH:MM" (es-ES). */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Fecha relativa amigable para el historial:
 * "Hoy, 14:30" / "Ayer, 09:05" / "5 jun, 14:30".
 */
export function formatMealDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return `Hoy, ${formatTime(date)}`;
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return `Ayer, ${formatTime(date)}`;
  }
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Día de la semana en texto largo (es-ES), ej: "jueves". */
export function formatWeekday(date: Date): string {
  return date.toLocaleDateString("es-ES", { weekday: "long" });
}

/** Fecha larga sin año, ej: "jueves, 5 de junio". */
export function formatDayLong(date: Date): string {
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Saludo según la hora del día. */
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** Hoy en formato largo, ej: "jueves, 5 de junio". */
export function formatTodayLong(): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

/** Date -> "YYYY-MM-DD" en hora local (para <input type="date">). */
export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "YYYY-MM-DD" -> Date en hora LOCAL al mediodía (estable frente a husos/DST). */
export function fromDateInputValue(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}
