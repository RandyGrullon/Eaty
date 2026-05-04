import {
  getMissingFirebaseConfigKeys,
} from "@/lib/firebase-config";

/**
 * Muestra instrucciones si faltan NEXT_PUBLIC_* (sin tocar aún a init de Firebase).
 */
export function FirebaseEnvErrorScreen() {
  const missing = getMissingFirebaseConfigKeys();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-6 text-foreground">
      <div className="max-w-lg rounded-2xl border border-destructive/30 bg-card p-8 shadow-lg">
        <h1 className="text-lg font-bold text-destructive">
          Falta configurar Firebase
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sin estas variables, la app no puede iniciar. Copia
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">
            .env.example
          </code>{" "}
          a
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">
            .env.local
          </code>{" "}
          y pega el bloque de <strong>Firebase → Project settings → General → Your
          apps</strong> (app web).
        </p>
        <p className="mt-3 text-sm font-medium">Variables faltantes:</p>
        <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
          {missing.map((k) => (
            <li key={k}>
              <code className="text-xs text-foreground">{k}</code>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Después, reinicia el servidor{" "}
          <code className="rounded bg-muted px-1">pnpm dev</code> para recargar
          entorno.
        </p>
      </div>
    </div>
  );
}
