/** `NEXT_PUBLIC_DEMO_MODE=1`: la app corre sin Firebase ni Groq, con datos de ejemplo. */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "1";
}
