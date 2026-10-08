import { AlertTriangle } from "lucide-react";
import { getMissingFirebaseConfigKeys } from "@/lib/firebase-config";

/**
 * Muestra instrucciones si faltan NEXT_PUBLIC_* (sin tocar aún a init de Firebase).
 */
export function FirebaseEnvErrorScreen() {
  const missing = getMissingFirebaseConfigKeys();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 text-foreground sm:p-6">
      <div className="surface w-full max-w-lg p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-bold">Falta configurar Firebase</h1>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Sin estas variables la app no puede iniciar. Copia
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">.env.example</code> a
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">.env.local</code> y pega el bloque de{" "}
          <strong className="font-medium text-foreground">
            Firebase → Project settings → General → Your apps
          </strong>{" "}
          (app web).
        </p>
        <p className="mt-4 text-sm font-medium">Variables faltantes</p>
        <ul className="mt-2 space-y-1.5">
          {missing.map((k) => (
            <li key={k} className="break-all rounded-xl bg-muted/60 px-3 py-2">
              <code className="text-xs">{k}</code>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Después reinicia <code className="rounded bg-muted px-1">pnpm dev</code> para recargar el entorno.
        </p>
      </div>
    </div>
  );
}
