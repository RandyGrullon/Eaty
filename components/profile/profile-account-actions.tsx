"use client";

import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Download,
  Loader2,
} from "lucide-react";

interface ProfileDangerZoneProps {
  exporting: boolean;
  onExport: () => void;
  onDelete: () => void;
}

/** Exportación GDPR y borrado de cuenta. */
export function ProfileDangerZone({
  exporting,
  onExport,
  onDelete,
}: ProfileDangerZoneProps) {
  return (
    <section className="pt-12 border-t border-border/40">
      <div className="rounded-[2rem] border border-destructive/20 bg-destructive/5 p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h3 className="text-xl font-black tracking-tight text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Zona de Peligro
          </h3>
          <p className="mt-1 text-sm font-medium text-muted-foreground/80 max-w-sm">
            Eliminar tu cuenta borrará permanentemente todos tus registros. Te recomendamos descargar tus datos antes.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onExport}
            disabled={exporting}
            className="rounded-2xl font-black h-12 px-6 border-destructive/20 text-destructive hover:bg-destructive/5"
          >
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Descargar mis Datos (GDPR)
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            className="rounded-2xl font-black h-12 px-8 shadow-xl shadow-destructive/20"
          >
            Eliminar Cuenta Definitivamente
          </Button>
        </div>
      </div>
    </section>
  );
}
