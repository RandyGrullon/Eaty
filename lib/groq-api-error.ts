/** Error lanzado por las llamadas a `/api/analyze-food` y `/api/nutrition-tips`. */
export class GroqApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GroqApiError";
    this.status = status;
  }
}

export function userMessageForGroqError(err: unknown): string {
  if (err instanceof GroqApiError) {
    if (err.status === 401) {
      return "Sesión caducada o no válida. Inicia sesión de nuevo.";
    }
    if (err.status === 429) {
      return err.message;
    }
    if (err.status === 503) {
      return err.message;
    }
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Ha ocurrido un error. Inténtalo de nuevo.";
}
