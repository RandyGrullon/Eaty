import { BrandIntro } from "@/components/app/splash-intro";

/** Pantalla de arranque mientras se resuelve la sesión y el perfil. */
export function ShellLoading() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 bg-background">
      <BrandIntro compact />
      <div className="h-1 w-28 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/2 animate-[shell-progress_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>
      <style>{`@keyframes shell-progress{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}`}</style>
      <span className="sr-only">Cargando Eaty…</span>
    </div>
  );
}
