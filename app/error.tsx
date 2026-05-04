"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("app/error", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <h1 className="text-lg font-semibold text-foreground">Algo falló</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message}
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground/80">Digest: {error.digest}</p>
      ) : null}
      <Button type="button" onClick={reset} variant="default">
        Reintentar
      </Button>
    </div>
  );
}
